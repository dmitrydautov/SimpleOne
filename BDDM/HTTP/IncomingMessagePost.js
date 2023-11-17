ss.importIncludeScript("BDDMResponseClasses");

(function (request, response) {
  const responseBody = new Response();
  try {
    const reqBody = request.getBody();

    if(Object.keys(reqBody).length > 0) {
      reqBody.forEach((message) => {
        insertIncomingMessages(message, responseBody);
      });
    } else {
      responseBody.addError(new ErrorMessage('Request is empty'));
    }
  } catch (e) {
    responseBody.addError(e.stack);
  }
  response.setStatus(responseBody.success ? 200 : 500);
  response.setBody(responseBody);
})(SimpleApiRequest, SimpleApiResponse);

function insertIncomingMessages(message, responseBody) {
  const incomingMessage = new SimpleRecord("core_bddm_integration_incoming");
  incomingMessage.initialize();
  incomingMessage.core_esb_message_id = message.esbMessageId;
  incomingMessage.core_message = JSON.stringify(message.messageBody);
  incomingMessage.core_bddm_entity_name = message.bddmEntityName;

  const recordId = incomingMessage.insert();
  if (recordId === '0') {
    responseBody.addError(
      new ErrorMessage(incomingMessage.getErrors(), null)
    );
  } else {
    _checkStatusAfterInsert(recordId)
  }

  function _checkStatusAfterInsert(sysId) {
    const incomingMessage = new SimpleRecord("core_bddm_integration_incoming");
    incomingMessage.get(sysId);

    if(incomingMessage.core_status === 'error') {
      responseBody.addError(
        new ErrorMessage('Internal processing error', sysId)
      );
    }
  }
}
