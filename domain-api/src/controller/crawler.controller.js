const connection = require('../app/database')
const CrawlerService = require('../service/crawler.service')
const operationLogService = require('../service/operation-log.service')
const { OUTPUT_BASE_URL } = require('../config/server')
const path = require('path')
const archiver = require('archiver')
const fs = require('fs')


const CRAWLER_OUTPUT_DIR = path.join(__dirname, '..', '..', 'crawler_output')

class CrawlerController {

  crawlerService = new CrawlerService(CRAWLER_OUTPUT_DIR)


  runningTasks = new Map()

  /**
   * 创建爬虫任务
   */
  async create(ctx) {
    const { source_url, landingpage_id, created_by } = ctx.request.body

    if (!source_url) {
      ctx.body = {
        code: 1,
        message: '请提供要爬取的URL'
      }
      return
    }

    try {

      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const timestamp = `${pad(now.getFullYear() % 100)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
      const domainName = source_url.replace(/https?:\/\//, '').split('/')[0].replace(/[^a-zA-Z0-9]/g, '_')
      const taskFolder = `${timestamp}_${domainName}`


      const statement = `INSERT INTO crawler_tasks (landingpage_id, task_folder, source_url, status, created_by) VALUES (?, ?, ?, 'pending', ?)`
      const [result] = await connection.execute(statement, [landingpage_id || null, taskFolder, source_url, created_by || null])

      const taskId = result.insertId


      operationLogService.log(
        ctx.user.id,
        ctx.user.name,
        'webpage',
        'crawl_start',
        `网页地址: ${source_url}`,
        null,
        { taskId, source_url, taskFolder }
      )


      this.runCrawlerTask(taskId, source_url, taskFolder, ctx.user)

      ctx.body = {
        code: 0,
        message: '爬虫任务创建成功',
        data: {
          task_id: taskId,
          task_folder: taskFolder,
          status: 'pending'
        }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '创建任务失败',
        error: error.message
      }
    }
  }

  /**
   * 执行爬虫任务
   */
  async runCrawlerTask(taskId, sourceUrl, taskFolder, user = null) {

    this.runningTasks.set(Number(taskId), { status: 'running', startTime: Date.now() })


    await connection.execute(
      'UPDATE crawler_tasks SET status = ?, progress = 10, error_message = NULL WHERE id = ?',
      ['running', taskId]
    )

    const crawler = new CrawlerService()

    try {

      let lastUpdateProgress = 10

      const result = await crawler.start(sourceUrl, (progress) => {
        const currentProgress = progress.progress || 0


        const milestones = [20, 40, 60, 80]
        for (const milestone of milestones) {
          if (currentProgress >= milestone && lastUpdateProgress < milestone) {
            connection.execute(
              'UPDATE crawler_tasks SET progress = ? WHERE id = ?',
              [milestone, taskId]
            ).catch(() => {})
            lastUpdateProgress = milestone
            break
          }
        }
      }, taskFolder)


      const fs = require('fs-extra')
      const folderPath = crawler.getTaskFolderPath(taskFolder)
      let totalSize = 0
      let fileCount = 0

      try {
        const files = await fs.readdir(folderPath, { recursive: true })
        for (const file of files) {
          const filePath = path.join(folderPath, file)
          const stat = await fs.stat(filePath)
          if (stat.isFile()) {
            totalSize += stat.size
            fileCount++
          }
        }
      } catch (err) {

      }


      const baseUrl = OUTPUT_BASE_URL
      await connection.execute(
        `UPDATE crawler_tasks
         SET status = 'completed', progress = 100, file_count = ?, total_size = ?,
         preview_url = ?, download_url = ?
         WHERE id = ?`,
        [
          fileCount,
          totalSize,
          `${baseUrl}/crawler/preview/${taskFolder}/index.html`,
          `${baseUrl}/crawler/download/${taskFolder}`,
          taskId
        ]
      )

      this.runningTasks.delete(taskId)
    } catch (error) {

      await connection.execute(
        'UPDATE crawler_tasks SET status = ?, error_message = ? WHERE id = ?',
        ['failed', error.message, taskId]
      )


      if (user) {
        operationLogService.log(
          user.id,
          user.name,
          'webpage',
          'crawl_fail',
          `爬取网页失败: ${sourceUrl}`,
          { taskId, sourceUrl },
          { error: error.message }
        )
      }

      this.runningTasks.delete(taskId)
    }
  }

  /**
   * 查询任务状态
   */
  async getStatus(ctx) {
    const { id } = ctx.params

    try {
      const [tasks] = await connection.execute(
        'SELECT * FROM crawler_tasks WHERE id = ?',
        [id]
      )

      if (tasks.length === 0) {
        ctx.body = {
          code: 1,
          message: '任务不存在'
        }
        return
      }

      const task = tasks[0]




      if (task.status === 'running' && !this.runningTasks.has(Number(id))) {
        const taskCreateTime = new Date(task.createAt).getTime()
        const now = Date.now()

        if (now - taskCreateTime > 60000) {
          await connection.execute(
            'UPDATE crawler_tasks SET status = ?, error_message = ? WHERE id = ?',
            ['failed', '任务已中断', id]
          )
          task.status = 'failed'
          task.error_message = '任务已中断'
        }
      }

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: task
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 获取任务列表
   */
  async list(ctx) {
    const { landingpage_id, status, created_by, page = 1, size = 10 } = ctx.query


    const pageNum = Number(page)
    const sizeNum = Number(size)



    try {
      let whereClause = 'WHERE 1=1'
      const params = []

      if (landingpage_id) {
        whereClause += ' AND landingpage_id = ?'
        params.push(landingpage_id)
      }

      if (status) {
        whereClause += ' AND status = ?'
        params.push(status)
      }


      if (created_by) {
        whereClause += ' AND created_by = ?'
        params.push(created_by)
      }

      const offset = (pageNum - 1) * sizeNum






      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM crawler_tasks ${whereClause}`,
        params
      )


      const listSql = `SELECT * FROM crawler_tasks ${whereClause} ORDER BY createAt DESC LIMIT ${sizeNum} OFFSET ${offset}`


      const [list] = await connection.execute(
        listSql,
        params
      )




      let filteredList = list
      if (status === 'running') {
        const now = Date.now()


        filteredList = list.filter(task => {

          if (this.runningTasks.has(Number(task.id))) {

            return true
          }

          const taskCreateTime = new Date(task.createAt).getTime()
          const isRecent = now - taskCreateTime <= 60000
          console.log(`任务 ${task.id} 不在内存中，创建时间距现在 ${Math.floor((now - taskCreateTime) / 1000)}秒，保留:`, isRecent)
          return isRecent
        })




        for (const task of list) {
          if (!this.runningTasks.has(Number(task.id))) {
            const taskCreateTime = new Date(task.createAt).getTime()
            if (now - taskCreateTime > 60000) {
              console.log(`更新任务 ${task.id} 状态为 failed（服务已重启）`)
              await connection.execute(
                'UPDATE crawler_tasks SET status = ?, error_message = ? WHERE id = ?',
                ['failed', '任务已中断', task.id]
              )
            }
          }
        }


        const newTotal = filteredList.length
        ctx.body = {
          code: 0,
          message: '获取成功',
          data: {
            list: filteredList,
            total: newTotal,
            page: pageNum,
            size: sizeNum
          }
        }
        return
      }

      ctx.body = {
        code: 0,
        message: '获取成功',
        data: {
          list,
          total: countResult[0].total,
          page: pageNum,
          size: sizeNum
        }
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '获取失败',
        error: error.message
      }
    }
  }

  /**
   * 删除任务
   */
  async remove(ctx) {
    const { id } = ctx.params

    try {

      const [tasks] = await connection.execute(
        'SELECT task_folder FROM crawler_tasks WHERE id = ?',
        [id]
      )

      if (tasks.length === 0) {
        ctx.body = {
          code: 1,
          message: '任务不存在'
        }
        return
      }

      const { task_folder } = tasks[0]


      const crawler = new CrawlerService(CRAWLER_OUTPUT_DIR)
      await crawler.deleteTaskFolder(task_folder)


      await connection.execute('DELETE FROM crawler_tasks WHERE id = ?', [id])

      ctx.body = {
        code: 0,
        message: '删除成功'
      }
    } catch (error) {
      ctx.body = {
        code: 1,
        message: '删除失败',
        error: error.message
      }
    }
  }

  /**
   * 下载 ZIP 文件
   */
  async download(ctx) {
    const { taskFolder } = ctx.params

    try {
      const crawler = new CrawlerService(CRAWLER_OUTPUT_DIR)
      const folderPath = crawler.getTaskFolderPath(taskFolder)

      console.log('下载请求 - taskFolder:', taskFolder)
      console.log('文件夹路径:', folderPath)
      console.log('文件夹是否存在:', fs.existsSync(folderPath))


      if (!fs.existsSync(folderPath)) {
        ctx.status = 404
        ctx.body = '文件不存在，请先完成爬取任务'
        return
      }


      ctx.set('Content-Type', 'application/zip')
      ctx.set('Content-Disposition', `attachment; filename="${taskFolder}.zip"`)


      const archive = archiver('zip', {
        zlib: { level: 1 }  // level 1 最快，level 9 最慢但压缩率最高
      })


      archive.on('error', (err) => {
        console.error('打包错误:', err)
      })


      archive.on('end', () => {
        console.log('ZIP 打包完成，大小:', archive.pointer(), 'bytes')
      })


      archive.directory(folderPath, false)


      ctx.body = archive
      ctx.status = 200


      await archive.finalize()
    } catch (error) {
      console.error('下载错误:', error)
      ctx.status = 500
      ctx.body = '下载失败: ' + error.message
    }
  }
}

module.exports = new CrawlerController()
