class ConfigHelper {
  #config
  constructor(configName) {
    this._getConfig(configName);
  }

  getConfigMessage() {
    return JSON.parse(this.#config.core_config)
  }

  getEntityName() {
    return this.#config.core_entity_name
  }

  _getConfig(configName) {
    const config = new SimpleRecord('core_bddm_outgoing_config');
    config.addQuery('core_name', configName);
    config.query();

    if (config.getRowCount() !== 0) {
      config.next();

      if (config.core_active) {
        this.#config = config
      } else {
        throw new Error('The config is not active')
      }
    } else {
      throw new Error('The config not is set for this table')
    }
  }
}