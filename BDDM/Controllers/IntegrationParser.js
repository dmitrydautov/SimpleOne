ss.importIncludeScript("SimpleTableHelper");
ss.importIncludeScript("IntegrationTemporaryStubHelper");
const REFERENCE_TYPE = "reference";
const LIST_TYPE = "list";
const PARENT_TABLE_FIELD = "parentTableField";
const KEY_FIELD = "keyField";
class IntegrationParser {
  #integrationMessage;
  #relatedEntities = [];


  /**
   * @param {string} message - message from integration service
   * @returns {string} Errors
   * @description This method created SimpleOne records based on integration messages (BDDM Integration Incoming)
   */
  parse(message) {
    try {
      this.#integrationMessage = JSON.parse(message);
      return this._parseObjectHandler();
    } catch (e) {
      ss.error("We have an error from IntegrationParser: " + e.stack);
      throw new Error("We have an error from IntegrationParser: " + e + '\n' + e.stack)
    }
  }

  _parseObjectHandler() {
    const tableName = Object.keys(this.#integrationMessage)[0];
    const tableInfo = new SimpleTableHelper(tableName)
    const objectData = this.#integrationMessage[tableName];
    const currentTableInfo = tableInfo.getColumnsInfo();
    const tempObject = this._prepareObject(
      this._searchObject(
        tableName,
        objectData.keyField,
        objectData[objectData.keyField]
      ),
      objectData,
      currentTableInfo
    );
    if (this.#relatedEntities.length > 0) {
      this._relatedEntityHelper(tempObject.sys_id, objectData);
    }

    //Create target record field value for created simple record
    return ss.getDocIdByIds(tableInfo.getTableId(), tempObject.sys_id)
  }

  _prepareObject(currentObject, fieldToValueMap, tableInfo) {
    let isKeyFieldFined = false;
    Object.keys(fieldToValueMap).forEach((field) => {
      if (field === KEY_FIELD) {
        isKeyFieldFined = true;
        return;
      }
      if (!Object.keys(tableInfo).includes(field)) {
        this.#relatedEntities.push(field);
      }
      if (tableInfo[field].columnType === REFERENCE_TYPE) {
        currentObject[field] = this._referenceTypeHelper(
          tableInfo[field].referenceTableName,
          fieldToValueMap[field]
        );
      } else if (tableInfo[field].columnType === LIST_TYPE) {
        currentObject[field] = this._arrayTypeHelper(
          fieldToValueMap[field],
          tableInfo[field].referenceTableName
        );
      } else {
        currentObject[field] = fieldToValueMap[field];
      }
    });
    if (!isKeyFieldFined) {
      throw new Error("KeyField is not set");
    }
    return this._upsert(currentObject);
  }

  _searchObject(table, field, value, createStub) {
    const record = new SimpleRecord(table);
    record.addQuery(field, "in", value);
    record.query();
    if (record.getRowCount() > 0) {
      const tableInfo = new SimpleTableHelper(table).getColumnsInfo();
      record.next();
      if (tableInfo.hasOwnProperty('is_temporary_stub')) {
        record.is_temporary_stub = false;
      }
    } else if (createStub) {
      return new IntegrationTemporaryStubHelper().insertObject(table, field, value)
    } else {
      const newRecord = new SimpleRecord(table);
      newRecord.initialize();

      return newRecord
    }
    return record;
  }

  _relatedEntityHelper(parentId, parentObjectData) {
    this.#relatedEntities.forEach((relatedTableName) => {
      const field = parentObjectData[relatedTableName][KEY_FIELD];
      const value = parentObjectData[relatedTableName][field];
      const record = this._searchObject(relatedTableName, field, value);
      //TODO: Implement later
      // if (record.sys_id) {
      // const parentTableField =
      // parentObjectData[relatedTableName][PARENT_TABLE_FIELD];
      // record[parentTableField] = parentId;
      // record.update();
      // }
    });
  }

  _arrayTypeHelper(array, table) {
    let result = [];
    array.forEach((elem) => {
      const field = Object.keys(elem)[0];
      const tempObject = this._searchObject(table, field, elem[field], true);
      if (tempObject.sys_id) {
        result.push(tempObject.sys_id);
      }
    });
    return result.join(",");
  }

  _referenceTypeHelper(table, referenceData) {
    const field = Object.keys(referenceData)[0];
    const record = this._searchObject(table, field, referenceData[field], true);
    return record.sys_id;
  }

  _upsert(currentObject) {
    let result;
    if (currentObject.sys_id) {
      result = currentObject.update();
    } else {
      result = currentObject.insert();
    }
    if (result === '0') {
      throw new Error(currentObject.getErrors());
    }
    return currentObject;
  }
}