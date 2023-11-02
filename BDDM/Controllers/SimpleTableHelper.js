class SimpleTableHelper {
  #tableInfo;
  #tableName;

  /**
   * @constructor
   * @param {string} tableName - Simple One table name
   */
  constructor(tableName) {
    this.#tableName = tableName;
  }

  /**
   * @returns {Object}
   * @description - Formatted object with Simple One table information
   */
  get tableInfo() {
    if (!this.#tableInfo) {
      this.#tableInfo = this._getTableObject();
    }
    return this.#tableInfo;
  }

  _getTableObject() {
    const result = {};
    const table = new SimpleRecord("sys_db_table");
    table.addQuery("name", this.#tableName);
    table.query();

    if (table.next()) {
      result.tableId = table.sys_id;

      const columns = new SimpleRecord("sys_db_column");
      columns.addQuery("table_id", table.sys_id);
      columns.query();

      while (columns.next()) {
        result.fieldsInfo[columns.column_name] = {
          referenceTableName: columns.reference_id.name,
          columnName: columns.column_name,
          columnType: columns.column_type_id.name,
        };
      }
    }
  }

  /**
   * @returns {String}
   * @description - Simple One table id
   */
  getTableId() {
    return this.tableInfo.tableId;
  }

  /**
   * @returns {Object}
   * @description - Object with columns info from table
   */
  getColumnsInfo() {
    return this.tableInfo.fieldsInfo;
  }
}
