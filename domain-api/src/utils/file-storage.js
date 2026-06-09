const path = require('path');
const fs = require('fs');
const multer = require('@koa/multer')


const storage = multer.diskStorage({

  destination: function (req, file, cb) {

    const date = new Date(); // Wed Apr 02 2025 14:22:42 GMT+0800 (中国标准时间)
    const year = date.getFullYear();  // 2025
    const month = String(date.getMonth() + 1).padStart(2, '0'); // '04'
    const day = String(date.getDate()).padStart(2, '0'); // '02'
    const folderName = `${year}-${month}-${day}`; // '2025-04-02'


    const uploadDir = `./uploads/landingpage_preview/${folderName}` 

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const ext = path.extname(file.originalname); // 提取图片上传时的后缀扩展名, 例如 .png
    const randomName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`; // 上传到服务器上时图片的文件名。(时间戳-随机字符串.扩展名)
    cb(null, randomName);
  }
});



const storage2 = multer.diskStorage({

  destination: function (req, file, cb) {

    const date = new Date(); // Wed Apr 02 2025 14:22:42 GMT+0800 (中国标准时间)
    const year = date.getFullYear();  // 2025
    const month = String(date.getMonth() + 1).padStart(2, '0'); // '04'
    const day = String(date.getDate()).padStart(2, '0'); // '02'
    const folderName = `${year}-${month}-${day}`; // '2025-04-02'


    const uploadDir = `./uploads/room_pictures/${folderName}` 

   
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const ext = path.extname(file.originalname); // 提取图片上传时的后缀扩展名, 例如 .png
    const randomName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`; // 上传到服务器上时图片的文件名。(时间戳-随机字符串.扩展名)
    cb(null, randomName);
  }
});




const storage3 = multer.diskStorage({

  destination: function (req, file, cb) {

    const date = new Date(); // Wed Apr 02 2025 14:22:42 GMT+0800 (中国标准时间)
    const year = date.getFullYear();  // 2025
    const month = String(date.getMonth() + 1).padStart(2, '0'); // '04'
    const day = String(date.getDate()).padStart(2, '0'); // '02'
    const folderName = `${year}-${month}-${day}`; // '2025-04-02'


    const uploadDir = `./uploads/cms_user_avatar/${folderName}`

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const ext = path.extname(file.originalname); // 提取图片上传时的后缀扩展名, 例如 .png
    const randomName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`; // 上传到服务器上时图片的文件名。(时间戳-随机字符串.扩展名)
    cb(null, randomName);
  }
});



const storage4 = multer.diskStorage({

  destination: function (req, file, cb) {

    const date = new Date(); // Wed Apr 02 2025 14:22:42 GMT+0800 (中国标准时间)
    const year = date.getFullYear();  // 2025
    const month = String(date.getMonth() + 1).padStart(2, '0'); // '04'
    const day = String(date.getDate()).padStart(2, '0'); // '02'
    const folderName = `${year}-${month}-${day}`; // '2025-04-02'


    const uploadDir = `./uploads/domains_file/${folderName}`

    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const ext = path.extname(file.originalname); // 提取图片上传时的后缀扩展名, 例如 .png
    const randomName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`; // 上传到服务器上时图片的文件名。(时间戳-随机字符串.扩展名)
    cb(null, randomName);
  }
});


const storage5 = multer.diskStorage({

  destination: function (req, file, cb) {

    const date = new Date(); // Wed Apr 02 2025 14:22:42 GMT+0800 (中国标准时间)
    const year = date.getFullYear();  // 2025
    const month = String(date.getMonth() + 1).padStart(2, '0'); // '04'
    const day = String(date.getDate()).padStart(2, '0'); // '02'
    const folderName = `${year}-${month}-${day}`; // '2025-04-02'


    const uploadDir = `./uploads/landingpage_file/${folderName}` // 项目根目录下的uploads文件夹中的domains_file文件夹中。

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const ext = path.extname(file.originalname); // 提取图片上传时的后缀扩展名, 例如 .png
    const randomName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`; // 上传到服务器上时图片的文件名。(时间戳-随机字符串.扩展名)
    cb(null, randomName);
  }
});



const storage6 = multer.diskStorage({

  destination: function (req, file, cb) {

    const uploadDir = `./uploads/landing_preview`

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {

    const landingPageId = req.params?.landingId || req.body?.landingId || Date.now();

    const ext = path.extname(file.originalname); // 提取图片上传时的后缀扩展名, 例如 .png

    const randomName = `landing_${landingPageId}_${Date.now()}${ext}`;
    cb(null, randomName);
  }
});



const storage7 = multer.diskStorage({
  destination: function (req, file, cb) {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const folderName = `${year}-${month}-${day}`

    const uploadDir = `./uploads/payment_track_attachments/${folderName}`

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const randomName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
    cb(null, randomName)
  }
})


const storage8 = multer.diskStorage({
  destination: function (req, file, cb) {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const folderName = `${year}-${month}-${day}`

    const uploadDir = `./uploads/payment_track_vouchers/${folderName}`

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const randomName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
    cb(null, randomName)
  }
})


module.exports = {
  storage,
  storage2,
  storage3,
  storage4,
  storage5,
  storage6,
  storage7,
  storage8
}