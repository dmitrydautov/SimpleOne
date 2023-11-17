ss.importIncludeScript('IntegrationSerializer')
ss.importIncludeScript('ConfigHelper')
class IntegrationManager {
  /**
   *
   * @param {Object} record - Simple One record
   * @param {Object} configName - BDDM Integration Config record
   * @returns {Object}
   * @description - Method gets simple one record, BDDM Outgoing Config, BDDM Entity name
   *                and create BDDM Outgoing Message.
   */
  createOutgoingRecord(record, configName) {
    try {
      this._createIntegrationOutgoingRecord(record, configName);
    } catch (e) {
      ss.info('We have an error form IntegrationManager script: ' + e + '\n' + e.stack)
    }
  }

  _getTableNameId(record) {
    const tableName = record.getTableName();

    const table = new SimpleRecord("sys_db_table");
    table.addQuery('name', tableName);
    table.query();
    table.next();

    return table.sys_id;
  }

  _createIntegrationOutgoingRecord(record, configName) {
    const targetRecord = ss.getDocIdByIds(this._getTableNameId(record), record.sys_id);
    const configHelper = new ConfigHelper(configName)
    const entity = configHelper.getEntityName();
    const config = JSON.stringify(new IntegrationSerializer().serialize(record, configHelper))

    const outgoingRecord = new SimpleRecord('core_bddm_integration_outgoing');
    outgoingRecord.core_target_record = targetRecord;
    outgoingRecord.core_status = 'new';
    outgoingRecord.core_message = config;
    outgoingRecord.core_bddm_entity_name = entity;

    const result = outgoingRecord.insert();

    if (result === 0) {
      throw new Error(outgoingRecord.getErrors());
    }
  }
}