'use strict';

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function(event, context) {
  try {
    console.log("event.session.application.applicationId=" + event.session.application
      .applicationId);

    /**
     * Uncomment this if statement and populate with your skill's application ID to
     * prevent someone else from configuring a skill that sends requests to this function.
     */

    //     if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.05aecccb3-1461-48fb-a008-822ddrt6b516") {
    //         context.fail("Invalid Application ID");
    //      }

    if (event.session.new) {
      onSessionStarted({
        requestId: event.request.requestId
      }, event.session);
    }

    if (event.request.type === "LaunchRequest") {
      onLaunch(event.request,
        event.session,
        function callback(sessionAttributes, speechletResponse) {
          context.succeed(buildResponse(sessionAttributes,
            speechletResponse));
        });
    } else if (event.request.type === "IntentRequest") {
      onIntent(event.request,
        event.session,
        function callback(sessionAttributes, speechletResponse) {
          context.succeed(buildResponse(sessionAttributes,
            speechletResponse));
        });
    } else if (event.request.type === "SessionEndedRequest") {
      onSessionEnded(event.request, event.session);
      context.succeed();
    }
  } catch (e) {
    context.fail("Exception: " + e);
  }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
  console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
    ", sessionId=" + session.sessionId);

  // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
  console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" +
    session.sessionId);

  var cardTitle = "Pallay, your score is 998!"
  var speechOutput = "You can tell Hello, World! to say Hello, World!"
  callback(session.attributes,
    buildSpeechletResponse(cardTitle, speechOutput, "", true));
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
  console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" +
    session.sessionId);

  var intent = intentRequest.intent,
    intentName = intentRequest.intent.name;

  // dispatch custom intents to handlers here
  if (intentName == 'WhatsMyScoreIntent') {
    handleTestRequest(intent, session, callback);
  } else if (intentName == 'NextScoreUpdateIntent') {
    handleNextScoreUpdateIntent(intent, session, callback);
  } else if (intentName == 'EndSessionIntent') {

  } else {
    throw "Invalid intent";
  }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
  console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
    ", sessionId=" + session.sessionId);

  // Add any cleanup logic here
}

var thirtyDaysAgoInMs = 2592000000;
var dateNow = Date.now();

var monthNames = [
  "January", "February", "March",
  "April", "May", "June", "July",
  "August", "September", "October",
  "November", "December"
];

function nth(d) {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

var generateDate = function() {
  var min = dateNow - thirtyDaysAgoInMs;
  var max = dateNow;
  var date = new Date(Math.random() * (max - min) + min)

  return date;
}

var getDateAsString = function(date) {
  var month = date.getMonth();
  var day = date.getDate();

  return day + nth(day) + " of " + monthNames[month];
}

var randomLastUpdatedDate = generateDate();

var generateNextDate = function(fromDate) {
  return new Date(fromDate.getTime() + thirtyDaysAgoInMs);
}

function handleTestRequest(intent, session, callback) {
  callback(session.attributes,
    buildSpeechletResponseWithoutCard(
      "Your score is 998 and was last updated on the " + getDateAsString(
        randomLastUpdatedDate), "", false));
}

function handleNextScoreUpdateIntent(intent, session, callback) {
  callback(session.attributes,
    buildSpeechletResponseWithoutCard(
      "Your score will be next updated on the " + getDateAsString(
        generateNextDate(randomLastUpdatedDate)), "", true));
}

function handleEndSessionIntent(intent, session, callback) {
  callback(session.attributes,
    buildSpeechletResponseWithoutCard("You're welcome", "", true));
}

// ------- Helper functions to build responses -------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: "PlainText",
      text: output
    },
    card: {
      type: "Simple",
      title: title,
      content: output
    },
    reprompt: {
      outputSpeech: {
        type: "PlainText",
        text: repromptText
      }
    },
    shouldEndSession: shouldEndSession
  };
}

function buildSpeechletResponseWithoutCard(output, repromptText,
  shouldEndSession) {
  return {
    outputSpeech: {
      type: "PlainText",
      text: output
    },
    reprompt: {
      outputSpeech: {
        type: "PlainText",
        text: repromptText
      }
    },
    shouldEndSession: shouldEndSession
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: "1.0",
    sessionAttributes: sessionAttributes,
    response: speechletResponse
  };
}
