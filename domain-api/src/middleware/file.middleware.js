const multer = require('@koa/multer')
const storages = require('../utils/file-storage')




const uploadAvatar = multer({ storage: storages.storage });
const handleAvatar = uploadAvatar.single('landingpage_preview') // 传给singer('字符串')方法的字符串需要和前端input标签的name属性一致。也就是input标签的name属性的属性值应该也是 'cover_picture'





const uploadAvatar2 = multer({ storage: storages.storage2 });
const handleAvatar2 = uploadAvatar2.array('room_pictures')






const uploadAvatar3 = multer({ storage: storages.storage3 });
const handleAvatar3 = uploadAvatar3.single('cms_user_avatar') // 传给singer('字符串')方法的字符串需要和前端input标签的name属性一致。也就是input标签的name属性的属性值应该也是 'cms_user_avatar'





const uploadAvatar4 = multer({ storage: storages.storage4 });
const handleAvatar4 = uploadAvatar4.single('domains_file') // 传给singer('字符串')方法的字符串需要和前端input标签的name属性一致。也就是input标签的name属性的属性值应该也是 'domains_file'




const uploadAvatar5 = multer({ storage: storages.storage5 });
const handleAvatar5 = uploadAvatar5.single('landingpage_file') // 传给singer('字符串')方法的字符串需要和前端input标签的name属性一致。也就是input标签的name属性的属性值应该也是 'landingpage_file'



const uploadAvatar6 = multer({ storage: storages.storage6 });
const handleAvatar6 = uploadAvatar6.single('preview_image')



const uploadAttachment = multer({ storage: storages.storage7 })
const handleAttachmentUpload = uploadAttachment.single('payment_attachment')


const uploadVoucher = multer({ storage: storages.storage8 })
const handleVoucherUpload = uploadVoucher.single('payment_voucher')


module.exports = {
  handleAvatar,
  handleAvatar2,
  handleAvatar3,
  handleAvatar4,
  handleAvatar5,
  handleAvatar6,
  handleAttachmentUpload,
  handleVoucherUpload
}


/* 
1、Date.now(), 返回当前时间的时间戳（单位是毫秒, 例如: 1680456789012

2、Math.random(), 返回一个 0 到 1 之间的随机浮点数（不包括 1）。例如: 0.123456789。

3、Math.random().toString(16)。 .toString(16) 将浮点数转换为 16 进制字符串。例如: 0.123456789 转换为 16 进制后可能是 "0.1f7b2f"。

4、字符串.slice(2)是一个字符串方法, 从索引 2 开始截取字符串，直到字符串的末尾。 将 "0.1f7b2f" 变成 "1f7b2f"
*/