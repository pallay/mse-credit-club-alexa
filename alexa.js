function AlexaSkill(appId) {
  this._appId = appId;
}

AlexaSkill.speechOutputType = {
  PLAIN_TEXT: 'PlainText',
  SSML: 'SSML'
}

AlexaSkill.prototype.requestHandlers = {
  LaunchRequest: function(event, context, response) {
    this.eventHandlers.onLaunch.call(this, event.request, event.session,
      response);
  },

  IntentRequest: function(event, context, response) {
    this.eventHandlers.onIntent.call(this, event.request, event.session,
      response);
  },

  SessionEndedRequest: function(event, context) {
    this.eventHandlers.onSessionEnded(event.request, event.session);
    context.succeed();
  }
};

/**
 * Override any of the eventHandlers as needed
 */
AlexaSkill.prototype.eventHandlers = {
  /**
   * Called when the session starts.
   * Subclasses could have overriden this function to open any necessary resources.
   */
  onSessionStarted: function(sessionStartedRequest, session) {},

  /**
   * Called when the user invokes the skill without specifying what they want.
   * The subclass must override this function and provide feedback to the user.
   */
  onLaunch: function(launchRequest, session, response) {
    throw "onLaunch should be overriden by subclass";
  },

  /**
   * Called when the user specifies an intent.
   */
  onIntent: function(intentRequest, session, response) {
    var intent = intentRequest.intent,
      intentName = intentRequest.intent.name,
      intentHandler = this.intentHandlers[intentName];
    if (intentHandler) {
      console.log('dispatch intent = ' + intentName);
      intentHandler.call(this, intent, session, response);
    } else {
      throw 'Unsupported intent = ' + intentName;
    }
  },

  /**
   * Called when the user ends the session.
   * Subclasses could have overriden this function to close any open resources.
   */
  onSessionEnded: function(sessionEndedRequest, session) {}
};

/**
 * Subclasses should override the intentHandlers with the functions to handle specific intents.
 */
AlexaSkill.prototype.intentHandlers = {};

AlexaSkill.prototype.execute = function(event, context) {
  try {
    console.log("session applicationId: " + event.session.application.applicationId);

    // Validate that this request originated from authorized source.
    if (this._appId && event.session.application.applicationId !== this._appId) {
      console.log("The applicationIds don't match : " + event.session.application
        .applicationId + " and " + this._appId);
      throw "Invalid applicationId";
    }

    if (!event.session.attributes) {
      event.session.attributes = {};
    }

    if (event.session.new) {
      this.eventHandlers.onSessionStarted(event.request, event.session);
    }

    // Route the request to the proper handler which may have been overriden.
    var requestHandler = this.requestHandlers[event.request.type];
    requestHandler.call(this, event, context, new Response(context, event.session));
  } catch (e) {
    console.log("Unexpected exception " + e);
    context.fail(e);
  }
};

var Response = function(context, session) {
  this._context = context;
  this._session = session;
};

function createSpeechObject(optionsParam) {
  if (optionsParam && optionsParam.type === 'SSML') {
    return {
      type: optionsParam.type,
      ssml: optionsParam.speech
    };
  } else {
    return {
      type: optionsParam.type || 'PlainText',
      text: optionsParam.speech || optionsParam
    }
  }
}

Response.prototype = (function() {
  var buildSpeechletResponse = function(options) {
    var alexaResponse = {
      outputSpeech: createSpeechObject(options.output),
      shouldEndSession: options.shouldEndSession
    };
    if (options.reprompt) {
      alexaResponse.reprompt = {
        outputSpeech: createSpeechObject(options.reprompt)
      };
    }
    if (options.cardTitle && options.cardContent) {
      alexaResponse.card = {
        type: "Simple",
        title: options.cardTitle,
        content: options.cardContent
      };
    }
    var returnResult = {
      version: '1.0',
      response: alexaResponse
    };
    if (options.session && options.session.attributes) {
      returnResult.sessionAttributes = options.session.attributes;
    }
    return returnResult;
  };

  return {
    tell: function(speechOutput) {
      this._context.succeed(buildSpeechletResponse({
        session: this._session,
        output: speechOutput,
        shouldEndSession: true
      }));
    },
    tellWithCard: function(speechOutput, cardTitle, cardContent) {
      this._context.succeed(buildSpeechletResponse({
        session: this._session,
        output: speechOutput,
        cardTitle: cardTitle,
        cardContent: cardContent,
        shouldEndSession: true
      }));
    },
    ask: function(speechOutput, repromptSpeech) {
      this._context.succeed(buildSpeechletResponse({
        session: this._session,
        output: speechOutput,
        reprompt: repromptSpeech,
        shouldEndSession: false
      }));
    },
    askWithCard: function(speechOutput, repromptSpeech, cardTitle,
      cardContent) {
      this._context.succeed(buildSpeechletResponse({
        session: this._session,
        output: speechOutput,
        reprompt: repromptSpeech,
        cardTitle: cardTitle,
        cardContent: cardContent,
        shouldEndSession: false
      }));
    }
  };
})();


/**
 * This sample shows how to create a Lambda function for handling Alexa Skill requests that:
 *
 * - Session State: Handles a multi-turn dialog model.
 * - Custom slot type: demonstrates using custom slot types to handle a finite set of known values
 * - SSML: Using SSML tags to control how Alexa renders the text-to-speech.
 *
 * Examples:
 * Dialog model:
 *  User: "Alexa, ask credit club what's my score"
 *  Alexa: "Who are you"
 *  User: "Pallay"
 *  Alexa: "What is your memorable word"
 *  User: "apple"
 *  Alexa: "Your score is 998 and was updated on the 28th of October"
 */

/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

/**
 * Array containing knock knock jokes.
 */
// var QUESTION_LIST = [
// {setup: "Beets!", speechPunchline: "Beats me!", cardPunchline: "Beats me!"},
// {setup: "Little Old Lady", speechPunchline: "I didn't know you could yodel!",
//     cardPunchline: "I didn't know you could yodel!"},
// ];

var SCORE_LIST = [{
  setup: "999",
  cardPunchline: "Off the scale!"
}, {
  setup: "888",
  cardPunchline: "Good"
}, {
  setup: "777",
  cardPunchline: "So-So"
}, ];

/**
 * The AlexaSkill prototype and helper functions
 */
// var AlexaSkill = require('./AlexaSkill');

/**
 * CreditClubSkill is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var CreditClubSkill = function() {
  AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
CreditClubSkill.prototype = Object.create(AlexaSkill.prototype);
CreditClubSkill.prototype.constructor = CreditClubSkill;

/**
 * Overriden to show that a subclass can override this function to initialize session state.
 */
CreditClubSkill.prototype.eventHandlers.onSessionStarted = function(
  sessionStartedRequest, session) {
  console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId +
    ", sessionId: " + session.sessionId);

  // Any session init logic would go here.
};

/**
 * If the user launches without specifying an intent, route to the correct function.
 */
CreditClubSkill.prototype.eventHandlers.onLaunch = function(launchRequest,
  session, response) {
  console.log("CreditClubSkill onLaunch requestId: " + launchRequest.requestId +
    ", sessionId: " + session.sessionId);

  handleTellMeAJokeIntent(session, response);
};

/**
 * Overriden to show that a subclass can override this function to teardown session state.
 */
CreditClubSkill.prototype.eventHandlers.onSessionEnded = function(
  sessionEndedRequest, session) {
  console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId +
    ", sessionId: " + session.sessionId);

  //Any session cleanup logic would go here.
};

CreditClubSkill.prototype.intentHandlers = {
  "TellMeMyScoreIntent": function(intent, session, response) {
    handleTellMeAJokeIntent(session, response);
  },

  "WhosThereIntent": function(intent, session, response) {
    handleWhosThereIntent(session, response);
  },

  "MemorableWordIntent": function(intent, session, response) {
    handleSetupNameWhoIntent(session, response);
  },

  "NextUpdateDateIntent": function(intent, session, response) {
    handleNextUpdatedDate(session, response);
  },

  "WhatsNextIntent": function(intent, session, response) {
    handleWhatsNext(session, response);
  },

  "AMAZON.HelpIntent": function(intent, session, response) {
    var speechText = "";

    switch (session.attributes.stage) {
      case 0:
        speechText =
          "Knock knock jokes are a fun call and response type of joke. " +
          "To start the joke, just ask by saying tell me a joke, or you can say exit.";
        break;
      case 1:
        speechText = "You can ask, who's there, or you can say exit.";
        break;
      case 2:
        speechText = "You can ask, who, or you can say exit.";
        break;
      default:
        speechText =
          "Knock knock jokes are a fun call and response type of joke. " +
          "To start the joke, just ask by saying tell me a joke, or you can say exit.";
    }

    var speechOutput = {
      speech: speechText,
      type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    var repromptOutput = {
      speech: speechText,
      type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    // For the repromptText, play the speechOutput again
    response.ask(speechOutput, repromptOutput);
  },

  "AMAZON.StopIntent": function(intent, session, response) {
    var speechOutput = "Goodbye";
    response.tell(speechOutput);
  },

  "AMAZON.CancelIntent": function(intent, session, response) {
    var speechOutput = "Goodbye";
    response.tell(speechOutput);
  }
};

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

function handleNextUpdatedDate(session, response) {
  var speechText = "Your score will be next updated on the " + getDateAsString(
    generateNextDate(randomLastUpdatedDate));
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "Credit Club", speechText);
}

function handleWhatsNext(session, response) {
  var speechText = "Coming soon you'll be able to apply for mortages!";
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "Credit Club", speechText);
}

function debugBySpeech(response, speechText) {
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "Credit Club", speechText);
}

/**
 * Selects a joke randomly and starts it off by saying "Knock knock".
 */
function handleTellMeAJokeIntent(session, response) {
  var speechText = "";

  //Reprompt speech will be triggered if the user doesn't respond.
  var repromptText = "You can ask, who's there";

  //Check if session variables are already initialized.
  if (session.attributes.stage) {

    //Ensure the dialogue is on the correct stage.
    if (session.attributes.stage === 0) {
      //     //The joke is already initialized, this function has no more work.
      //     // speechText = "knock knock!";
      speechText = 'at stage zero';
    } else {
      //     //The user attempted to jump to the intent of another stage.
      session.attributes.stage = 0;
      //     speechText = "That's not how knock knock jokes work! "
      //         + "knock knock";
    }
  } else {
    //Select a random joke and store it in the session variables.
    var randomScore = Math.floor(Math.random() * SCORE_LIST.length);

    //The stage variable tracks the phase of the dialogue.
    //When this function completes, it will be on stage 1.
    session.attributes.stage = 1;
    //session.attributes.setup = JOKE_LIST[jokeID].setup;
    // session.attributes.speechPunchline = JOKE_LIST[jokeID].speechPunchline;
    // session.attributes.cardPunchline = JOKE_LIST[jokeID].cardPunchline;

    session.attributes.setup =
      'I already have your email and password saved. \nWhat is the 1st, 2nd and 3rd characters of your memorable word';
    session.attributes.speechPunchline =
      "Your score is " + randomScore + " and was last updated on the " +
      getDateAsString(
        randomLastUpdatedDate);
    session.attributes.cardPunchline = "Your Experian Credit Score is " +
      randomScore;

    speechText = 'Who are you?';
  }

  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  var repromptOutput = {
    speech: repromptText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.ask(speechOutput, repromptOutput, "Credit Club", speechText);
}

/**
 * Responds to the user saying "Who's there".
 */
function handleWhosThereIntent(session, response) {
  var speechText = "";
  var repromptText = "";

  if (session.attributes.stage) {
    if (session.attributes.stage === 1) {
      //Retrieve the joke's setup text.
      speechText = session.attributes.setup;

      //Advance the stage of the dialogue.
      session.attributes.stage = 2;

      repromptText = "You can ask, " + speechText + " who?";
    } else {
      session.attributes.stage = 1;
      // speechText = "That's not how knock knock jokes work! <break time=\"0.3s\" /> "
      //     + "knock knock";
      speechText = "Sorry that is incorrect.  Please try again.";

      repromptText = "You can ask, who's there."
    }
  } else {

    //If the session attributes are not found, the joke must restart.
    speechText = "Sorry, I couldn't correctly retrieve the joke. " +
      "You can say, tell me a joke";

    repromptText = "You can say, tell me a joke";
  }

  var speechOutput = {
    speech: '<speak>' + speechText + '</speak>',
    type: AlexaSkill.speechOutputType.SSML
  };
  var repromptOutput = {
    speech: '<speak>' + repromptText + '</speak>',
    type: AlexaSkill.speechOutputType.SSML
  };
  response.ask(speechOutput, repromptOutput);
}

/**
 * Delivers the punchline of the joke after the user responds to the setup.
 */
function handleSetupNameWhoIntent(session, response) {
  var speechText = "",
    repromptText = "",
    speechOutput,
    repromptOutput,
    cardOutput;

  if (session.attributes.stage) {
    if (session.attributes.stage === 2) {

      speechText = session.attributes.speechPunchline;
      cardOutput = session.attributes.cardPunchline;
      speechOutput = {
        speech: '<speak>' + speechText + '</speak>',
        type: AlexaSkill.speechOutputType.SSML
      };
      //If the joke completes successfully, this function uses a "tell" response.
      response.tellWithCard(speechOutput, "Credit Club", cardOutput);
    } else {
      //   debugBySpeech(response, "bad days");

      session.attributes.stage = 1;
      speechText =
        "That's not how knock knock jokes work! <break time=\"0.3s\" /> " +
        "Knock knock!";
      cardOutput = "That's not how knock knock jokes work! " + "Knock knock!";

      repromptText = "You can ask who's there.";

      speechOutput = {
        speech: speechText,
        type: AlexaSkill.speechOutputType.SSML
      };
      repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
      };
      //If the joke has to be restarted, this function uses an "ask" response.
      response.askWithCard(speechOutput, repromptOutput, "Credit Club",
        cardOutput);
    }
  } else {
    debugBySpeech(response, "bad days two");
    // speechText = "Sorry, I couldn't correctly retrieve the joke. "
    //     + "You can say, tell me a joke";

    // repromptText = "You can say, tell me a joke";

    // speechOutput = {
    //     speech: speechText,
    //     type: AlexaSkill.speechOutputType.PLAIN_TEXT
    // };
    // repromptOutput = {
    //     speech: repromptText,
    //     type: AlexaSkill.speechOutputType.PLAIN_TEXT
    // };
    // response.askWithCard(speechOutput, repromptOutput, "Credit Club", speechOutput);
  }
}

// Create the handler that responds to the Alexa Request.
exports.handler = function(event, context) {
  // Create an instance of the CreditClub Skill.
  var skill = new CreditClubSkill();
  skill.execute(event, context);
};
