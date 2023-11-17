ss.importIncludeScript('IntegrationManager');

(function executeRule(current, previous = null /*not null only when action is update*/) {
  const REQUEST_POST_TYPE_NAMES = ['Transfer to Agency', 'PPOSM Installation and Maintenance']
  const TASK_POST_TYPE_NAMES = ['Withdrawal from WH', 'Acceptance to Agency', 'Withdrawal between Touchpoints', 'Withdrawal within Touchpoints', 'Withdrawal to Employee']
  const POSM_STATUSES = ['Open', 'In Progress', 'Waiting for', 'Completed', 'Cancelled', 'Declined', 'In progress with shortage'];

  if (REQUEST_POST_TYPE_NAMES.includes(current.posm_request.posm_type.posm_name) && TASK_POST_TYPE_NAMES.includes(current.posm_type.posm_name) && POSM_STATUSES.includes(current.posm_status)) {
    new IntegrationManager().createOutgoingRecord(current, 'POSM Withdrawal Task')
  }
})(current, previous);