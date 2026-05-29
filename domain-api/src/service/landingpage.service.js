const connection = require('../app/database')
const { SERVER_HOST, SERVER_PORT } = require('../config/server')

const isProd = process.env.NODE_ENV === 'production'

/**
 * 构建完整的预览图 URL
 */
function getFullPreviewUrl(relativePath) {

  const baseUrl = isProd
    ? `${SERVER_HOST}/api`  // 生产环境: https://efbox.work/api
    : `${SERVER_HOST}:${SERVER_PORT}`  // 开发环境: http://localhost:8001
  return `${baseUrl}${relativePath}`
}

class LandingService {

  async create(landingpage_info, userId, visibility = 'private') {

    const { landingname = '', landing_url = '', category_id, nas_filename = '', effect = '', remark = '' } = landingpage_info


    let statement, params
    const fields = ['landingname', 'landing_url', 'user_id', 'visibility', 'category_id']
    const values = [landingname, landing_url, userId, visibility, null]
    const placeholders = ['?', '?', '?', '?', '?']


    if (category_id && category_id !== '' && category_id !== 0) {
      values[4] = category_id  // 替换占位符的值
    }
    if (nas_filename) {
      fields.push('nas_filename')
      values.push(nas_filename)
      placeholders.push('?')
    }
    if (effect) {
      fields.push('effect')
      values.push(effect)
      placeholders.push('?')
    }
    if (remark) {
      fields.push('remark')
      values.push(remark)
      placeholders.push('?')
    }

    statement = `INSERT INTO \`landingpage\` (${fields.join(', ')}) VALUES (${placeholders.join(', ')});`
    params = values


    const [result] = await connection.execute(statement, params)
    return result
  }


  async list(userId, landingname, offset, size, start, end, landing_url, category_id) {
    const createAtStart = start ?? '2001-01-01 13:27:00'
    const createAtEnd = end ?? '2099-01-01 13:27:00'


    const params = [
      `%${landingname}%`,
      `%${landing_url}%`,
      createAtStart,
      createAtEnd,
      size,
      offset
    ];



    let sql1 = `
    SELECT
      l.*,
      CONCAT(lp.destination, '/', lp.filename) as screenshot_preview_url,
      ct.preview_url as crawler_preview_url,
      ct.task_folder as crawler_task_folder,
      ct.status as crawler_status,
      ct.progress as crawler_progress,
      u.name as creator_name,
      u.nickname as creator_nickname,
      u.avatar_url as creator_avatar_url
    FROM
      landingpage l
    LEFT JOIN land_preview_config lp ON lp.id = (
      SELECT id FROM land_preview_config lp2
      WHERE lp2.landingpage_id = l.id
      ORDER BY lp2.updateAt DESC, lp2.createAt DESC
      LIMIT 1
    )
    LEFT JOIN crawler_tasks ct ON ct.landingpage_id = l.id
      AND ct.id = (
        SELECT id FROM crawler_tasks ct2
        WHERE ct2.landingpage_id = l.id
          AND ct2.status = 'completed'
        ORDER BY ct2.createAt DESC
        LIMIT 1
      )
    LEFT JOIN cms_user u ON u.id = l.user_id
    WHERE
      (l.user_id = ? OR l.visibility = 'public')
      AND l.landingname LIKE ?
      AND l.landing_url LIKE ?
      AND l.createAt BETWEEN ? AND ?
    `


    params.unshift(userId)


    if (category_id !== undefined && category_id !== null && category_id !== '') {
      sql1 += ` AND l.category_id = ?`

      params.splice(params.length - 2, 0, category_id)
    }

    sql1 += `
    LIMIT
      ? OFFSET ?;
    `


    let countSql = `
      SELECT COUNT(*) AS totalCount FROM landingpage l
      WHERE (l.user_id = ? OR l.visibility = 'public')
      AND l.landingname LIKE ?
      AND l.landing_url LIKE ?
      AND l.createAt BETWEEN ? AND ?
    `


    const countParams = [userId, ...params.slice(1, -2)]


    if (category_id !== undefined && category_id !== null && category_id !== '') {
      countSql += ` AND l.category_id = ?`
    }


    const sql2 = 'SELECT COUNT(*) AS allCount FROM `landingpage`;'


    const [result1] = await connection.execute(sql1, params);


    const processedResult = result1.map(row => {
      const {
        screenshot_preview_url,
        crawler_preview_url,
        crawler_task_folder,
        crawler_status,
        crawler_progress,
        creator_name,
        creator_nickname,
        creator_avatar_url,
        ...rest
      } = row


      let previewUrl = null
      if (screenshot_preview_url) {

        previewUrl = getFullPreviewUrl(screenshot_preview_url.replace(/^\./, ''))
      } else if (crawler_preview_url) {

        previewUrl = crawler_preview_url
      }


      let fullAvatarUrl = null
      if (creator_avatar_url) {

        if (creator_avatar_url.startsWith('.')) {
          fullAvatarUrl = getFullPreviewUrl(creator_avatar_url.replace(/^\./, ''))
        } else if (creator_avatar_url.startsWith('/')) {

          fullAvatarUrl = getFullPreviewUrl(creator_avatar_url)
        } else {

          fullAvatarUrl = creator_avatar_url
        }
      }

      return {
        ...rest,
        preview_url: previewUrl,
        task_folder: crawler_task_folder || null,
        creator_name: creator_name || '',
        creator_nickname: creator_nickname || '',
        creator_avatar_url: fullAvatarUrl
      }
    })


    const [countResult] = await connection.execute(countSql, countParams);
    const totalCount = countResult[0].totalCount

    const [result3] = await connection.execute(sql2);
    return [processedResult, totalCount, result3]
  }


  async isOwner(id, userId) {
    const statement = 'SELECT user_id FROM landingpage WHERE id = ?;'
    const [result] = await connection.execute(statement, [id])
    if (result.length === 0) return false
    return result[0].user_id === userId
  }


  async getById(id) {
    const statement = 'SELECT * FROM landingpage WHERE id = ?;'
    const [result] = await connection.execute(statement, [id])
    return result.length > 0 ? result[0] : null
  }


  async updatePartial(landingId, data) {
    const updates = [];
    const values = [];


    if (data.landingname !== undefined) {
      updates.push('landingname = ?');
      values.push(data.landingname);
    }
    if (data.nas_filename !== undefined) {
      updates.push('nas_filename = ?');
      values.push(data.nas_filename);
    }
    if (data.effect !== undefined) {
      updates.push('effect = ?');
      values.push(data.effect);
    }
    if (data.remark !== undefined) {
      updates.push('remark = ?');
      values.push(data.remark);
    }

    if (updates.length === 0) {
      return null;
    }

    const updateFields = updates.join(', ');
    const sql = `UPDATE landingpage SET ${updateFields} WHERE id = ?;`;
    values.push(landingId);

    try {
      const [result] = await connection.execute(sql, values);
      return result;
    } catch (error) {
      console.error('UpdatePartial failed:', error);
      throw error;
    }
  }


  async remove(id, userId) {
    const statement = 'DELETE FROM `landingpage` WHERE id = ? AND user_id = ?;'
    await connection.execute(statement, [id, userId])
  }


  async update(landingId, landingname, landing_url, category_id, visibility, nas_filename, effect, remark) {

    const updates = [];
    const values = [];


    if (landingname !== undefined) {
      updates.push('landingname = ?');
      values.push(landingname);
    }
    if (landing_url !== undefined) {
      updates.push('landing_url = ?');
      values.push(landing_url);
    }
    if (category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(category_id);
    }
    if (visibility !== undefined) {
      updates.push('visibility = ?');
      values.push(visibility);
    }
    if (nas_filename !== undefined) {
      updates.push('nas_filename = ?');
      values.push(nas_filename);
    }
    if (effect !== undefined) {
      updates.push('effect = ?');
      values.push(effect);
    }
    if (remark !== undefined) {
      updates.push('remark = ?');
      values.push(remark);
    }


    if (updates.length === 0) {
      return null;
    }


    const updateFields = updates.join(', ');
    const sql = `UPDATE landingpage SET ${updateFields} WHERE id = ?;`;
    values.push(landingId);

    try {
      const [result] = await connection.execute(sql, values);
      return result;
    } catch (error) {
      console.error('Update failed:', error);
      throw error;
    }
  }


  async checkLandingExists(landing_url) {
    const statement = 'SELECT COUNT(*) AS count FROM `landingpage` WHERE landing_url = ?;'
    const [result] = await connection.execute(statement, [landing_url])
    return result[0].count > 0
  }
}

module.exports = new LandingService()