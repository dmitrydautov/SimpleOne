class SimpleTableHelper {
  TYPE_REFERENCE = 'reference';
  TYPE_LIST = 'list';
  TYPE_CHOICE = 'choice';

  #tableInfo;
  #tableName;
  #mandatoryFields = [];

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

    const table = this._search('sys_db_table', 'name', this.#tableName);

    while (table.next()) {
      result.tableId = table.sys_id;

      const tables = [table.sys_id];
      tables.push(...this._searchParentTable());

      const columns = this._search('sys_db_column', 'table_id', tables)

      while (columns.next()) {
        if (columns.mandatory) {
          this.#mandatoryFields.push(columns.column_name)
        }

        const choiceValues = [];
        if (columns.column_type_id.name === this.TYPE_CHOICE) {
          const choices = this._searchChoiceValues(columns.sys_id);
          while (choices.next()) {
            choiceValues.push(choices.value);
          }
        }

        result.fieldsInfo[columns.column_name] = {
          columnId: columns.sys_id,
          referenceTableName: columns.reference_id.name,
          columnName: columns.column_name,
          columnType: columns.column_type_id.name,
          isMandatory: columns.mandatory,
          choiceValues: choiceValues
        };
      }
    }
    return result;
  }

  _search(table, field, value) {
    const record = new SimpleRecord(table);
    record.addQuery(field, 'in', value)
    record.query();

    if (record.getRowCount() > 0) {
      return record;
    } else {
      throw new Error('Simple Table Helper can\'t find information about these data: ' +
        '\nTable: ' + table + ' \nField: ' + field + ' \nValue: ' + value);
    }
  }

  _searchParentTable() {
    return new SimpleTable(this.#tableName).getParentTables().map(table => table.sys_id)
  }

  _searchChoiceValues(value) {
    return this._search('sys_choice', 'column_id', value);
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

  /**
   * @return {String[]} - Array of mandatory fields
   */
  getMandatoryFields() {
    return this.#mandatoryFields;
  }
}
