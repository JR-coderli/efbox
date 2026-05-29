const fileService = require("../service/file.service")
const { OUTPUT_BASE_URL } = require('../config/server')
const landingService = require("../service/landingpage.service")
const userService = require("../service/user.service")
const path = require('path')
const { parseExcel, parseWord } = require('../utils/file-parse') // 解析Excel和Word文件的函数
const domainsService = require("../service/domains.service")
const landingpageService = require("../service/landingpage.service")

class FileController {

  async create(ctx, next) {


    const { landingpageId } = ctx.params // 获取落地页id

    if (ctx.request.files !== undefined) { // 多文件上传
      const picture_urls = []

      for (const file of ctx.request.files) {
        const { filename, mimetype, size, destination } = file

        await fileService.create(filename, mimetype, size, destination, landingpageId)


        const pictureUrl = `${OUTPUT_BASE_URL}/product/room_pictures/${landingpageId}/${filename}` 
        await fileService.InsertProdPicUrls(pictureUrl, landingpageId)

        picture_urls.push(pictureUrl)
      }


      ctx.body = {
        code: 0,
        message: '房源所有图片上传成功~',
        data: picture_urls
      }

    } else { // 单文件上传
      const { filename, mimetype, size, destination } = ctx.request.file 

      await fileService.create(filename, mimetype, size, destination, landingpageId)

      const pictureUrl = `${OUTPUT_BASE_URL}/landingpage/preview/${landingpageId}/${filename}`
      await landingService.updateLandingPreview(pictureUrl, landingpageId)
      

      ctx.body = {
        code: 0,
        message: '封面图片上传成功~',
        data: pictureUrl
      }
    }
  }



  async createDomainsFile(ctx, next) {
    try {


      const { filename, mimetype, size, destination, originalname, path: filePath } = ctx.request.file 
      await fileService.createFile(filename, mimetype, size, destination) // 将文件信息存储到数据库中



      const fileExtension = path.extname(originalname).toLowerCase().slice(1); // 获取文件的后缀名并转换为小写


      if (['xlsx', 'xls'].includes(fileExtension)) {
        const data = await parseExcel(filePath); // 获取到解析后的数据 (是一个数组, 数组中的元素都是对象, 一个对象对应excel表格中的一行数据)


        if (!data || data.length === 0) {
          ctx.body = { message: '文件内容为空' };
          return;
        } else if (data[0].现有域名 === undefined || data[0].落地页检测地址 === undefined) {
          ctx.body = { message: '上传的内容格式不正确' };
          return;
        }
        

        const unuploadedData = []

        const insertPromises = data.map(async (row) => {
          const { 序号, 现有域名, 落地页检测地址 } = row; // 解构每一行的数据
          const existingDomain = 现有域名; // 现有域名字段
          const landingPageUrl = 落地页检测地址; // 落地页检测地址字段

          const result = await domainsService.checkDomainExists(existingDomain);
          if (!result) {

            await domainsService.create({ existing_domain: existingDomain, landing_page_url: landingPageUrl });
          } else {

            unuploadedData.push({ 序号, 现有域名, 落地页检测地址 });
          }
        })


        await Promise.all(insertPromises);


        ctx.body = { message: "批量上传成功", unuploadedData };

      } else if (['doc', 'docx'].includes(fileExtension)) {
        result = await parseWord(filePath);
        ctx.body = { data: result };
      } else {
        ctx.body = { message: '不支持的文件格式' };
        return;
      }
    } catch (error) {
      ctx.body = { message: '文件处理失败', error: error.message };
    }
  }


  async createLandingPageFile(ctx, next) {
    try {


      const { filename, mimetype, size, destination, originalname, path: filePath } = ctx.request.file 
      await fileService.createFile(filename, mimetype, size, destination) // 将文件信息存储到数据库中



      const fileExtension = path.extname(originalname).toLowerCase().slice(1); // 获取文件的后缀名并转换为小写


      if (['xlsx', 'xls'].includes(fileExtension)) {
        const data = await parseExcel(filePath); // 获取到解析后的数据 (是一个数组, 数组中的元素都是对象, 一个对象对应excel表格中的一行数据)


        if (!data || data.length === 0) {
          ctx.body = { error: '文件内容为空' };
          return;
        } else if (data[0].落地页路径 === undefined) {
          ctx.body = { error: '上传的内容格式不正确' };
          return;
        }
        

        const unuploadedData = []

        const insertPromises = data.map(async (row) => {
          const { 序号, 落地页名称, 落地页地址, 落地页路径, 版本 } = row; // 解构每一行的数据
          const landingname = 落地页名称; // 落地页名称字段
          const landing_url = 落地页地址; // 落地页地址字段
          const landing_path = 落地页路径; // 落地页路径字段
          const version = 版本; // 版本字段

          const result = await landingpageService.checkLandingExists(landing_path);
          if (!result) {

            await landingpageService.create({ landingname, landing_url, landing_path, version });
          } else {

            unuploadedData.push({ 序号, 落地页名称, 落地页地址, 落地页路径, 版本 });
          }
        })


        await Promise.all(insertPromises);


        ctx.body = { message: "批量上传成功", unuploadedData };

      } else if (['doc', 'docx'].includes(fileExtension)) {
        result = await parseWord(filePath);
        ctx.body = { data: result };
      } else {
        ctx.body = { error: '不支持的文件格式' };
        return;
      }
    } catch (error) {
      ctx.body = { error: '文件处理失败', error: error.message };
    }
  }


  async createAvatar(ctx, next) {



    const { filename, mimetype, size, destination } = ctx.request.file
    const { id } = ctx.user


    await fileService.createAvatar(filename, mimetype, size, destination, id)


    const avatarUrl = `${OUTPUT_BASE_URL}/cms_users/avatar/${id}/${filename}`
    await userService.updateUserAvatar(avatarUrl, id)


    ctx.body = {
      code: 0,
      message: '后台头像上传成功',
      data: avatarUrl
    }
  }


  async uploadUserAvatar(ctx, next) {
    const { filename, mimetype, size, destination } = ctx.request.file
    const { userId } = ctx.params // 从路由参数获取用户ID

    if (!userId) {
      ctx.body = {
        code: 1,
        message: '缺少用户ID'
      }
      return
    }


    await fileService.createAvatar(filename, mimetype, size, destination, userId)


    const avatarUrl = `${OUTPUT_BASE_URL}${destination.replace(/^\./, '').replace(/\\/g, '/')}/${filename}`

    ctx.body = {
      code: 0,
      message: '头像上传成功',
      data: avatarUrl
    }
  }
}

module.exports = new FileController()