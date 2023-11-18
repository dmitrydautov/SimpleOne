ss.importIncludeScript('IntegrationParser');
const startupLimitation = ['PMI.BDDM.Staticdata.ADUserRole'];

(function executeRule(current, previous = null /*not null only when action is update*/) {
  if (!startupLimitation.includes(current.core_bddm_entity_name)) {
    try {
      current.core_status = 'processed'
      current.core_target_record = new IntegrationParser().parse(current.core_message);
    } catch (e) {
      current.core_status = 'error'
      current.core_processing_errors = e;
    }
  }
})(current, previous);