ss.importIncludeScript('SimpleTableHelper')
const FIELD_KEY = 'fields'
const REFERENCE_KEY = 'references'
const LIST_KEY = 'listFields'
const RELATED_ENTITY_KEY = 'relatedEntities'

class IntegrationSerializer {
  /**
   *
   * @param {Object} currentRecord - Simple One record
   * @param {Object} config - Config helper instance from IntegrationManager script
   * @returns {Object}
   * @description - Method gets Simple One record from Business process and searching Configuration
   *                from BDDM Outgoing Config which linked for this Object. Then created JS object based on config and
   *                return it.
   */
  serialize(currentRecord, config) {
    try {
      const tableName = currentRecord.getTableName();
      return this._serializeObject(tableName, config.getConfigMessage(), currentRecord)
    } catch (e) {
      //TODO: Сделать логирование, когда будет готов единообразный подход
      ss.info('We have an error in BDDM Serializer class: ' + e + '\n' + e.stack);
    }
  }

  _serializeObject(tableName, fieldSetConfig, currentValues) {
    return this._serializeHandler(tableName, fieldSetConfig, currentValues)
  }

  _serializeHandler(tableName, fieldSetConfig, currentValues) {
    if (currentValues) {
      const serializedObject = {};
      const tableInfo = this._getTableInformation(tableName).getColumnsInfo();

      Object.keys(fieldSetConfig).forEach(key => {
        switch (key) {

          case FIELD_KEY:
            fieldSetConfig[key].forEach(field => {
              serializedObject[field] = currentValues[field]
            })
            break;

          case REFERENCE_KEY:
            Object.keys(fieldSetConfig[key]).forEach((referenceField => {

              serializedObject[referenceField] =
                new IntegrationSerializer()._serializeObject(
                  tableInfo[referenceField].referenceTableName,
                  fieldSetConfig[key][referenceField],
                  currentValues[referenceField])
            }))
            break;

          case LIST_KEY:
            Object.keys(fieldSetConfig[key]).forEach((arrayField => {

              serializedObject[arrayField] =
                this._listTypeHelper(
                  currentValues[arrayField],
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