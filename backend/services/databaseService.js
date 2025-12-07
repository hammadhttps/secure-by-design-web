const { getConnection } = require('../config/database');
const { createLogger } = require('../utils/logger');

const logger = createLogger('DatabaseService');

class DatabaseService {
  static async executeQuery(sql, params = []) {
    const connection = await getConnection();
    try {
      const [results] = await connection.execute(sql, params);
      return results;
    } catch (error) {
      logger.error('Query execution failed:', {
        sql,
        params,
        error: error.message
      });
      throw error;
    } finally {
      connection.release();
    }
  }
  
  static async findOne(table, conditions) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');
    
    const values = Object.values(conditions);
    const sql = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
    
    const results = await this.executeQuery(sql, values);
    return results[0] || null;
  }
  
  static async findAll(table, conditions = {}, options = {}) {
    let whereClause = '';
    let values = [];
    
    if (Object.keys(conditions).length > 0) {
      whereClause = 'WHERE ' + Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      values = Object.values(conditions);
    }
    
    const orderBy = options.orderBy || 'id DESC';
    const limit = options.limit ? `LIMIT ${options.limit}` : '';
    
    const sql = `SELECT * FROM ${table} ${whereClause} ORDER BY ${orderBy} ${limit}`;
    
    return await this.executeQuery(sql, values);
  }
  
  static async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    
    const result = await this.executeQuery(sql, values);
    return result.insertId;
  }
  
  static async update(table, data, conditions) {
    const setClause = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');
    
    const values = [...Object.values(data), ...Object.values(conditions)];
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    
    const result = await this.executeQuery(sql, values);
    return result.affectedRows;
  }
  
  static async delete(table, conditions) {
    const whereClause = Object.keys(conditions)
      .map(key => `${key} = ?`)
      .join(' AND ');
    
    const values = Object.values(conditions);
    
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    
    const result = await this.executeQuery(sql, values);
    return result.affectedRows;
  }
}

module.exports = DatabaseService;