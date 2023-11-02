ss.importIncludeScript('SimpleTableHelper')
const FIELD_KEY = 'fields'
const REFERENCE_KEY = 'references'
const LIST_KEY = 'listFields'
const RELATED_ENTITY_KEY = 'relatedEntities'

class IntegrationSerializer {
  /**
   *
   * @param {Object} currentRecord - Simple One record
   * @returns {Object}
   * @description - Method gets Simple One record from Business process and searching Configuration
   *                from BDDM Outgoing Config which linked for this Object. Then created JS object based on config and
   *                return it.
   */
  serialize(currentRecord) {
    try {
      const tableName = currentRecord.getTableName();
      const tableInfo = this._getTableInformation(tableName)
      const fieldSetConfig = this._getTableConfig(tableInfo.getTableId())
      return this._serializeObject(tableName, fieldSetConfig, currentRecord)
    } catch (e) {
      //TODO: Сделать логирование, когда будет готов единообразный подход
      ss.info('We have an error in BDDM Serializer class: ' + e);
    }
  }

  _serializeObject(tableName, fieldSetConfig, currentValues) {
    return this._serializeHandler(tableName, fieldSetConfig, currentValues)
  }

  _serializeHandler(tableName, fieldSetConfig, currentValues) {
    const serializedObject = {};
    const tableInfo = this._getTableInformation(tableName).getColumnsInfo();

    Object.keys(fieldSetConfig).forEach(key => {
      switch (key) {
        case FIELD_KEY:
          fieldSetConfig[key].forEach(field => serializedObject[field] = currentValues[field])
          break;
        case REFERENCE_KEY:
          Object.keys(fieldSetConfig[key]).forEach((referenceField => {
            serializedObject[referenceField] =
              new IntegrationSerializer()._serializeObject(referenceField,
                fieldSetConfig[key][referenceField],
                currentValues[referenceField])
          }))
          break;
        case LIST_KEY:
          Object.keys(fieldSetConfig[key]).forEach((arrayField => {
            serializedObject[arrayField] =
              this._listTypeHelper(currentValues[arrayField],
                fieldSetConfig[key][arrayField],
                tableInfo[arrayField].referenceTableName)
          }))
          break;
        case RELATED_ENTITY_KEY:
          Object.keys(fieldSetConfig[key]).forEach((relatedEntity => {
            serializedObject[relatedEntity] =
              this._referenceTypeHelper(
                currentValues.sys_id,
                fieldSetConfig[key][relatedEntity].parentFieldName,
                fieldSetConfig[key][relatedEntity],
                relatedEntity
              )
          }))
          break;
      }
    })

    return serializedObject;
  }

  _getTableConfig(id) {
    const config = new SimpleRecord('core_bddm_outgoing_config');
    config.addQuery('core_simple_table', id);
    config.query();

    if (config.getRowCount() !== 0) {
      config.next();

      if (config.core_active) {
        return JSON.parse(config.core_config);
      } else {
        throw new Error('The config is not active')
      }
    } else {
      throw new Error('The config not is set for this table')
    }
  }

  _getTableInformation(tableName) {
    const tableInfo = new SimpleTableHelper(tableName);

    if (!tableInfo) {
      throw new Error('Can\'t find information about table ' + tableName);
    }
    return tableInfo;
  }


  _listTypeHelper(ids, fieldSet, tableName) {
    const result = [];
    const records = this._searchObjects(tableName, ids.split(','))
    while (records.next()) {
      result.push(new IntegrationSerializer()._serializeObject(tableName, fieldSet, records))
    }

    return result;
  }

  _referenceTypeHelper(parentId, parentField, relatedFieldSetConfig, relatedEntity) {
    const result = [];
    const records = this._searchObjects(relatedEntity, parentId, parentField);

    while (records.next()) {
      result.push(new IntegrationSerializer()
        ._serializeObject(relatedEntity, relatedFieldSetConfig, records))
    }
    return result;
  }

  _searchObjects(tableName, ids, field = 'sys_id') {
    const records = new SimpleRecord(tableName)
    if (ids instanceof Array) {
      records.addQuery(field, 'in', ids);
    } else {
      records.addQuery(field, ids);
    }
    records.query();

    return records;
  }
}