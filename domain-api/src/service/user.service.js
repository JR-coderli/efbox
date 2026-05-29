const connection = require('../app/database')
const { OUTPUT_BASE_URL } = require('../config/server')

class UserService {

  async create(user) {

    const { name, password, role_id, avatar_url } = user


    const statement = 'INSERT INTO `cms_user` (name, password, role_id, avatar_url) VALUES (?, ?, ?, ?);'


    const [result] = await connection.execute(statement, [name, password, role_id, avatar_url || null])
    return result
  }


  async findUserByName(name) {
    const statement = 'SELECT * FROM `cms_user` WHERE name = ?;'
    const [values] = await connection.execute(statement, [name])
    return values
  }


  async queryById(id) {
    const statement = `
      SELECT
        cms_user.id,
        cms_user.name,
        cms_user.nickname,
        cms_user.role_id,
        cms_user.createAt,
        cms_user.updateAt,
        CONCAT(ac.destination, '/', ac.filename) as avatar_path,
        ac.filename as avatar_filename,
        ac.destination as avatar_destination,
        JSON_OBJECT(
          'id', role.id,
          'name', role.name,
          'intro', role.intro,
          'createAt', role.createAt,
          'updateAt', role.updateAt
        ) AS "role"
      FROM cms_user
      LEFT JOIN role ON cms_user.role_id = role.id
      LEFT JOIN avatar_config ac ON ac.user_id = cms_user.id
      WHERE cms_user.id = ?
      ORDER BY ac.createAt DESC
      LIMIT 1;
    `

    const [result] = await connection.execute(statement, [id])

    if (result.length > 0) {
      const user = result[0]

      if (user.avatar_path) {
        user.avatar_url = `${OUTPUT_BASE_URL}${user.avatar_path.replace(/^\./, '').replace(/\\/g, '/')}`
      } else {
        user.avatar_url = null
      }

      delete user.avatar_path
      delete user.avatar_filename
      delete user.avatar_destination
    }

    return result
  }


  async list(name, size, offset, start, end) {

    const getUserListStatement = `
      SELECT
        u.id,
        u.name,
        u.nickname,
        u.role_id,
        u.createAt,
        u.updateAt,
        CONCAT(ac.destination, '/', ac.filename) as avatar_path,
        ac.filename as avatar_filename,
        ac.destination as avatar_destination,
        r.name AS role_name
      FROM cms_user u
      LEFT JOIN role r ON u.role_id = r.id
      LEFT JOIN avatar_config ac ON ac.user_id = u.id
      WHERE u.name LIKE ?
        AND u.createAt >= ?
        AND u.createAt < ?
      ORDER BY u.id DESC
      LIMIT ? OFFSET ?
    `


    const getTotalCountStatement = `
      SELECT COUNT(*) AS totalCount
      FROM cms_user
      WHERE name LIKE ?
        AND createAt >= ?
        AND createAt < ?
    `


    const getAllCountStatement = `SELECT COUNT(*) AS allCount FROM cms_user;`

    const createAtStart = start ?? '2001-01-01 13:27:00'
    const createAtEnd = end ?? '2099-01-01 13:28:00'

    try {

      const [userList] = await connection.execute(
        getUserListStatement,
        [`%${name}%`, createAtStart, createAtEnd, String(size), String(offset)]
      )


      userList.forEach(user => {
        if (user.avatar_path) {
          user.avatar_url = `${OUTPUT_BASE_URL}${user.avatar_path.replace(/^\./, '').replace(/\\/g, '/')}`
        } else {
          user.avatar_url = null
        }

        delete user.avatar_path
        delete user.avatar_filename
        delete user.avatar_destination
      })


      const [totalCountResult] = await connection.execute(
        getTotalCountStatement,
        [`%${name}%`, createAtStart, createAtEnd]
      )


      const [allCountResult] = await connection.execute(getAllCountStatement)

      const result = {
        list: userList,
        totalCount: totalCountResult[0].totalCount,
        allCount: allCountResult[0].allCount,
      }

      return result
    } catch (error) {
      console.log(error)
      return {
        list: [],
        totalCount: 0,
        allCount: 0,
      }
    }
  }


  async remove(id) {
    const statement = 'DELETE FROM `cms_user` WHERE id = ?;'
    await connection.execute(statement, [id])
  }


  async update(id, updateData) {

    const { name, nickname, role_id, password, avatar_url } = updateData
    const fields = []
    const values = []

    if (name !== undefined) {
      fields.push('name = ?')
      values.push(name)
    }
    if (nickname !== undefined) {
      fields.push('nickname = ?')
      values.push(nickname)
    }
    if (role_id !== undefined) {
      fields.push('role_id = ?')
      values.push(role_id)
    }
    if (password !== undefined && password !== '') {
      fields.push('password = ?')
      values.push(password)
    }
    if (avatar_url !== undefined) {
      fields.push('avatar_url = ?')
      values.push(avatar_url)
    }

    if (fields.length === 0) {
      return null
    }

    values.push(id)
    const statement = `UPDATE cms_user SET ${fields.join(', ')} WHERE id = ?;`
    const [result] = await connection.execute(statement, values)


    if (avatar_url === null) {
      await connection.execute('DELETE FROM `avatar_config` WHERE user_id = ?;', [id])
    }

    return result
  }


  async updateUserAvatar(avatarUrl, userId) {
    const statement = 'UPDATE `cms_user` SET avatar_url = ? WHERE id = ?;'
    const [result] = await connection.execute(statement, [avatarUrl, userId])
    return result
  }
}

module.exports = new UserService()
