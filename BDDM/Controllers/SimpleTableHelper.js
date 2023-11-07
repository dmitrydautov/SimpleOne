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
    const result = {
      fieldsInfo: {}
    };
    const table = new SimpleRecord("sys_db_table");
    table.addQuery("name", this.#tableName);
    table.query();

    while (table.next()) {
      result.tableId = table.sys_id;

      const tables = [table.sys_id];
      tables.push(...this._searchParentTable());

      const columns = new SimpleRecord("sys_db_column");
      columns.addQuery("table_id", 'in', tables);
      columns.query();

      while (columns.next()) {
        result.fieldsInfo[columns.column_name] = {
          referenceTableName: columns.reference_id.name,
          columnName: columns.column_name,
          columnType: columns.column_type_id.name,
        };
      }
    }
    return result;
  }

  _searchParentTable() {
    return  new SimpleTable(this.#tableName).getParentTables().map(table => table.sys_id)
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
