class IntegrationTemporaryStubHelper {
  INACTIVE_STATUS = 'inactive';

  CODE_FIELDS = ['code', 'posm_code']

  TYPE_MAP = {
    REFERENCE: ['reference'],
    LIST: ['list'],
    CHOICE: ['choice'],
    STRING: ['field_name', 'text', 'string'],
    INTEGER: ['integer'],
    FLOAT: ['float'],
    DATE: ['date', 'datetime'],
  }

  TEMPORARY_DATA = {
    STRING: 'Temporary',
    INTEGER: 10,
    FLOAT: 10.00,
    DATE: new SimpleDateTime().getDate(),
    CODE: 'TEMP001'
  }

  insertObject(tableName, field, value) {
    const tableHelper = new SimpleTableHelper(tableName);
    const fieldInfo = tableHelper.getColumnsInfo();
    const mandatoryFields = tableHelper.getMandatoryFields();

    const newRecord = new SimpleRecord(tableName);

    newRecord.initialize();
    if (Object.keys(fieldInfo).includes('is_temporary_stub')) {
      newRecord.is_temporary_stub =  true
    }
    if (field && value) {
      newRecord[field] = value;
    }

    mandatoryFields.forEach(tempField => {
      if (tempField === field) return

      const type = fieldInfo[tempField].columnType
      if (this.TYPE_MAP.DATE.includes(type)) {
        newRecord[tempField] = this.TEMPORARY_DATA.DATE;
      } else if (this.TYPE_MAP.FLOAT.includes(type)) {
        newRecord[tempField] = this.TEMPORARY_DATA.FLOAT;
      } else if (this.TYPE_MAP.STRING.includes(type)) {
        newRecord[tempField] = this.TEMPORARY_DATA.STRING;
      } else if (this.TYPE_MAP.INTEGER.includes(type)) {
        newRecord[tempField] = this.TEMPORARY_DATA.INTEGER;
      } else if (this.TYPE_MAP.CHOICE.includes(type)) {
        newRecord[tempField] = fieldInfo[tempField].choiceValues.includes(this.INACTIVE_STATUS) ?
          this.INACTIVE_STATUS : fieldInfo[tempField].choiceValues[0]
      }

      if (this.CODE_FIELDS.includes(tempField)) {
        newRecord[tempField] = this.TEMPORARY_DATA.CODE + this._getRandomIntInclusive(100, 999)
      }
    })
    const result = newRecord.insert()

    if (result === '0') {
      throw new Error(newRecord.getErrors())
    }
    return newRecord;
  }

  _getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //Максимум и минимум включаются
  }
}