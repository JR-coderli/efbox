const connection = require('../app/database')

class WorkspaceService {
  /**
   * 智能同步工作区数据
   * 对比后决定：新增、更新、删除、跳过
   */
  async syncWorkspaces(workspaces) {
    if (!workspaces || workspaces.length === 0) {
      return { inserted: 0, updated: 0, deleted: 0, skipped: 0, total: 0 }
    }


    const [existing] = await connection.execute(
      'SELECT `workspace_id`, `name` FROM `cf_workspaces`'
    )
    const existingMap = new Map(existing.map(e => [e.workspace_id, e]))


    const toInsert = []
    const toUpdate = []
    let skipped = 0

    workspaces.forEach(w => {
      const workspaceId = w.workspace_id
      const existingData = existingMap.get(workspaceId)

      if (!existingData) {

        toInsert.push(w)
      } else if (existingData.name !== w.name) {

        toUpdate.push(w)
      } else {

        skipped++
      }
    })


    const newIds = new Set(workspaces.map(w => w.workspace_id))
    const toDelete = [...existingMap.keys()].filter(id => !newIds.has(id))

    console.log(`[工作区同步] 新增: ${toInsert.length}, 更新: ${toUpdate.length}, 跳过: ${skipped}, 删除: ${toDelete.length}`)


    if (toInsert.length > 0) {
      const insertStatement = `
        INSERT INTO \`cf_workspaces\`
          (\`workspace_id\`, \`name\`, \`synced_at\`)
        VALUES ?
      `

      const insertValues = toInsert.map(w => [
        w.workspace_id,
        w.name,
        new Date()
      ])

      await connection.query(insertStatement, [insertValues])
    }


    if (toUpdate.length > 0) {
      const workspaceIdsToUpdate = toUpdate.map(w => w.workspace_id)


      const insertStatement = `
        INSERT INTO \`cf_workspaces\`
          (\`workspace_id\`, \`name\`, \`synced_at\`)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          \`name\` = VALUES(\`name\`),
          \`synced_at\` = VALUES(\`synced_at\`),
          \`updated_at\` = NOW()
      `

      const insertValues = toUpdate.map(w => [
        w.workspace_id,
        w.name,
        new Date()
      ])

      await connection.query(insertStatement, [insertValues])
    }


    if (toDelete.length > 0) {
      await connection.query(
        'DELETE FROM `cf_workspaces` WHERE `workspace_id` IN (?)',
        [toDelete]
      )
    }

    return {
      inserted: toInsert.length,
      updated: toUpdate.length,
      skipped,
      deleted: toDelete.length,
      total: workspaces.length
    }
  }

  /**
   * 获取所有工作区列表
   */
  async list() {
    const statement = `
      SELECT
        workspace_id,
        name
      FROM cf_workspaces
      ORDER BY name ASC
    `
    const [list] = await connection.execute(statement)
    return list
  }
}

module.exports = new WorkspaceService()
