ss.importIncludeScript("BDDMResponseClasses");
const SETTINGS = getIntegrationSettings();

const STATUS_NEW = "new";
const STATUS_PROCESSED = "processed";
const STATUS_ERROR = "error";

const RESPONSE_STATUS_OK = "OK";
const RESPONSE_STATUS_ERROR = "ERROR";
const RESPONSE_STATUS_SKIPPED = "SKIPPED";

let messageIdToResponses = {};

(function (request, response) {
  const responseBody = new Response();
  try {
    const reqBody = request.getBody();

    if (reqBody.length === 0) {
      responseBody.addError(
        new ErrorMessage('Request is empty', null)
      );
    }
    prepeareMapFromResponse(reqBody, messageIdToResponses, responseBody);

    const outgoingMessage = getOutgoingMessages(
      Object.keys(messageIdToResponses)
    );

    while (outgoingMessage.next()) {
      checkingOutgoingMessage(outgoingMessage);
      let result = outgoingMessage.update();

      if (result === 0) {
        responseBody.addError(
          new ErrorMessage(outgoingMessage.getErrors(), outgoingMessage.sys_id)
        );
      }
    }
  } catch (e) {
    responseBody.addError(e.stack);
  }
  response.setStatus(responseBody.success ? 200 : 500);
  response.setBody(responseBody);
})(SimpleApiRequest, SimpleApiResponse);

function checkingOutgoingMessage(outgoingMessage) {
  let response = messageIdToResponses[outgoingMessage.sys_id];

  switch (response.sendingResult) {
    case RESPONSE_STATUS_OK:
      outgoingMessage.core_status = STATUS_PROCESSED;
      outgoingMessage.core_esb_message_id = response.esbMessageId
      break;
    case RESPONSE_STATUS_ERROR:
      if (outgoingMessage.core_status !== STATUS_ERROR) {
        ss.eventQueue(
          "BDDMNotification",
          outgoingMessage,
          prepeareEmailOfUsersForNotification()
        );
      }
      outgoingMessage.core_status = STATUS_ERROR;
      outgoingMessage.core_sending_errors = response.errors && response.errors.length > 0 ?
        formatErrorMessage(response.errors) :
        'Undefined error';
      break;
    case RESPONSE_STATUS_SKIPPED:
      outgoingMessage.core_status = STATUS_NEW;
      break;

    default:
      break;
  }
}

function getOutgoingMessages(ids) {
  const outgoingMessage = new SimpleRecord("core_bddm_integration_outgoing");
  outgoingMessage.addQuery("sys_id", "in", ids);
  outgoingMessage.orderBy("sys_created_at");
  outgoingMessage.query();

  return outgoingMessage;
}

function getIntegrationSettings() {
  const settings = new SimpleRecord("core_bddm_integration_settings");
  settings.addQuery("core_name", "in", "default");
  settings.query();

  return settings.next();
}

function prepeareMapFromResponse(reqBody, messageIdToResponses, responseBody) {
  reqBody.forEach((requestElement) => {
    if (requestElement.sendingResult && requestElement.esbMessageId && requestElement.recordId) {
      messageIdToResponses[requestElement.recordId] = requestElement;
    } else {
      responseBody.addError(
        new ErrorMessage('sendingResult or esbMessageId or recordId field is empty', requestElement.recordId)
      );
    }
  });
}

function formatErrorMessage(errors) {
  let result = "";
  errors.forEach(
    (error) => (result += `[${error.ERROR_TYPE}] ${error.message} \n`)
  );
  return result;
}

function prepeareEmailOfUsersForNotification() {
  const user = new SimpleRecord("user");
  user.addQuery("sys_id", "in", SETTINGS.core_users_to_be_notified);
  user.query();

  let result = "";

  while (user.next()) {
    result += user.email + "; ";
  }

  return result;
}
