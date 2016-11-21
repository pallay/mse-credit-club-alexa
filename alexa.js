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
        type: "Standard",
        title: options.cardTitle,
        text: options.cardContent,
        image: {
          smallImageUrl: "https://s3-eu-west-1.amazonaws.com/credit-club/sd.png",
          largeImageUrl: "https://s3-eu-west-1.amazonaws.com/credit-club/sd.png"
        }
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
 *  User: "msm"
 *  Alexa: "Your score is 998 and was updated on the 28th of October"
 */

/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

var SCORE_LIST = [{
  score: "999",
  scoreDesc: "On the moon!"
}, {
  score: "777",
  scoreDesc: "Good"
}, {
  score: "333",
  scoreDesc: "which is low"
}];

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

  handleTellMeMyScoreIntent(session, response);
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
    handleTellMeMyScoreIntent(session, response);
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

  "SayGoodbyeIntent": function(intent, session, response) {
    handleGoodbye(session, response);
  },

  "SayHelloIntent": function(intent, session, response) {
    handleHello(session, response);
  },

  "HaveInsightsChangedIntent": function(intent, session, response) {
    handleHaveInsightsChanged(session, response);
  },

  "WhatsComingUpIntent": function(intent, session, response) {
    handleWhatsComingUp(session, response);
  },

  "WhatsMyEligibilityIntent": function(intent, session, response) {
    handleMyEligibility(session, response);
  },

  "WhatsMyTopThreeCardsIntent": function(intent, session, response) {
    handleTopThreeCards(session, response);
  },

  "AMAZON.HelpIntent": function(intent, session, response) {
    var speechText = "";

    switch (session.attributes.stage) {
      case 0:
        speechText =
          "You can ask me what your Experian credit score is or you can exit.";
        break;
      case 1:
        speechText = "You need to let me know who you are.";
        break;
      case 2:
        speechText = "You need to answer your memorable word.";
        break;
      default:
        speechText =
          "You might find it easier using the credit club web application. Here is a link so that you can login";
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
    var speechOutput =
      "Okay remember to read the Martin's weekly tip on Tuesday";
    response.tell(speechOutput);
  },

  "AMAZON.CancelIntent": function(intent, session, response) {
    var speechOutput = "Sorry did I do something wrong. Spank me.";
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
  response.tellWithCard(speechOutput, "MSE's Credit Club", speechText);
}

function handleWhatsComingUp(session, response) {
  var speechText =
    "Coming soon in 2017, you'll be able to apply for mortages! Register through me, and I won't mention using Siri or Ok Google";
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "MSE's Credit Club", speechText);
}

function handleHaveInsightsChanged(session, response) {
  var speechText =
    "Your address has become more stable and is now green. \n You are now earning interest on your Visa credit card. You should switch to a better card!";
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "MSE's Credit Club", speechText);
}

function handleHello(session, response) {
  var speechText =
    "Hello everyone! I am the voice of Martin Lewis from the telly. Thanks for letting me be the star of the hackathon.";
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "MSE's Credit Club", speechText);
}

function handleGoodbye(session, response) {
  var speechText =
    "Signup to the app - why haven't you already! \n \nAlexa: adding a voice to MSEs Credit Club";
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "MSE's Credit Club", speechText);
}

function handleMyEligibility(session, response) {
  var speechText =
    "You have HIGH eligibilty for credit cards and loans. Well done!";
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "MSE's Credit Club", speechText);
}

function handleTopThreeCards(session, response) {
  var speechText =
    "You are eligible for \n Barclay Card One, MBNA Two and Mastercard Three. \n You have 100% approval for each card. You can apply online by clicking on the link here.";
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "MSE's Credit Club", speechText);
}

function debugBySpeech(response, speechText) {
  var speechOutput = {
    speech: speechText,
    type: AlexaSkill.speechOutputType.PLAIN_TEXT
  };
  response.tellWithCard(speechOutput, "MSE's Credit Club", speechText);
}

function handleTellMeMyScoreIntent(session, response) {
  var speechText = "";

  //Reprompt speech will be triggered if the user doesn't respond.
  var repromptText = "You can ask, what the credit score is";

  //Check if session variables are already initialized.
  if (session.attributes.stage) {

    //Ensure the dialogue is on the correct stage.
    if (session.attributes.stage === 0) {
      //     //The score is already initialized, this function has no more work.
      speechText = 'at stage zero';
    } else {
      //     //The user attempted to jump to the intent of another stage.
      session.attributes.stage = 0;
    }
  } else {
    //Select a random score
    var randomScore = SCORE_LIST[Math.floor(Math.random() * SCORE_LIST.length)];

    //The stage variable tracks the phase of the dialogue.
    //When this function completes, it will be on stage 1.
    session.attributes.stage = 1;

    session.attributes.memWordPrompt =
      'I already have your email and password saved. \nWhat is the 2nd, 4th and 7th characters of your memorable word';
    session.attributes.speechScore =
      "Your Experian score is " + randomScore.score + " which is " +
      randomScore.scoreDesc + ". It was last updated on the " +
      getDateAsString(randomLastUpdatedDate);
    session.attributes.cardScore = "Your Experian Credit Score is " +
      randomScore.score + " which is " + randomScore.scoreDesc +
      ". It was last updated on the " +
      getDateAsString(randomLastUpdatedDate);

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
  response.ask(speechOutput, repromptOutput, "MSE's Credit Club", speechText);
}

/**
 * Responds to the user saying "Who's there".
 */
function handleWhosThereIntent(session, response) {
  var speechText = "";
  var repromptText = "";

  if (session.attributes.stage) {
    if (session.attributes.stage === 1) {
      //Retrieve the prompt text.
      speechText = session.attributes.memWordPrompt;

      //Advance the stage of the dialogue.
      session.attributes.stage = 2;

      repromptText = "You can ask, " + speechText + " who?";
    } else {
      session.attributes.stage = 1;
      speechText = "Sorry that is incorrect. Please try again.";

      repromptText = "You can ask, who's there."
    }
  } else {

    speechText = "Sorry, I couldn't correctly access Credit Club. " +
      "You can say again";

    repromptText = "You can try again or use the website";
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
 * Delivers the response after the memWordPrompt.
 */
function handleSetupNameWhoIntent(session, response) {
  var speechText = "",
    repromptText = "",
    speechOutput,
    repromptOutput,
    cardOutput;

  if (session.attributes.stage) {
    if (session.attributes.stage === 2) {

      speechText = session.attributes.speechScore;
      cardOutput = session.attributes.cardScore;
      speechOutput = {
        speech: '<speak>' + speechText + '</speak>',
        type: AlexaSkill.speechOutputType.SSML
      };
      response.tellWithCard(speechOutput, "MSE's Credit Club", cardOutput);
    } else {

      session.attributes.stage = 1;
      speechText =
        "That's not how the Credit Club app works! <break time=\"0.3s\" /> " +
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
      response.askWithCard(speechOutput, repromptOutput, "MSE's Credit Club",
        cardOutput);
    }
  } else {
    speechText = "Sorry, I couldn't correctly connect to Credit Club."

    repromptText = "You can say, ask for your score";

    speechOutput = {
      speech: speechText,
      type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    repromptOutput = {
      speech: repromptText,
      type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.askWithCard(speechOutput, repromptOutput, "MSE's Credit Club",
      speechOutput);
  }
}

// Create the handler that responds to the Alexa Request.
exports.handler = function(event, context) {
  // Create an instance of the CreditClub Skill.
  var skill = new CreditClubSkill();
  skill.execute(event, context);
};
