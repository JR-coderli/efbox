const connection = require('../app/database')

class FileService {

  async create(filename, mimetype, size, destination, landingpageId) {
    const statement = 'INSERT INTO `land_preview_config` (filename, mimetype, size, destination, landingpage_id) VALUES (?, ?, ?, ?, ?);'
    const [result] = await connection.execute(statement, [filename, mimetype, size, destination, landingpageId])
    return result
  }


  async queryPicConfig(landingId, picName) {
    const statement = `SELECT * FROM land_preview_config WHERE landingpage_id = ? AND filename LIKE ?;`
    const [result] = await connection.execute(statement, [landingId, `%${picName}%`])
    return result[0]
  }


  async createFile(filename, mimetype, size, destination) {
    const statement = 'INSERT INTO `xlsx_file_config` (filename, mimetype, size, destination) VALUES (?, ?, ?, ?);'
    const [result] = await connection.execute(statement, [filename, mimetype, size, destination])
    return result
  }


  async createAvatar(filename, mimetype, size, destination, userId) {

    await connection.execute('DELETE FROM `avatar_config` WHERE user_id = ?;', [userId])

    const statement = 'INSERT INTO `avatar_config` (filename, mimetype, size, destination, user_id) VALUES (?, ?, ?, ?, ?);'
    const [result] = await connection.execute(statement, [filename, mimetype, size, destination, userId])
    return result
  }


  async queryAvatarPicConfig(userId, picName) {
    const statement = `SELECT * FROM avatar_config WHERE user_id = ? AND filename LIKE ?;`
    const [result] = await connection.execute(statement, [userId, `%${picName}%`])
    return result[0]
  }


  async updateLandPreview(filename, mimetype, size, landingpageId, destination) {

    await connection.execute('DELETE FROM land_preview_config WHERE landingpage_id = ?', [landingpageId])

    const statement = 'INSERT INTO land_preview_config (filename, mimetype, size, landingpage_id, destination) VALUES (?, ?, ?, ?, ?)'
    const [result] = await connection.execute(statement, [filename, mimetype, size, landingpageId, destination])
    return result
  }


  async deleteLandPreview(landingpageId) {
    const statement = `DELETE FROM land_preview_config WHERE landingpage_id = ?;`
    const [result] = await connection.execute(statement, [landingpageId])
    return result
  }
}

module.exports = new FileService()
