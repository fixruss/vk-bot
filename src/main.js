#!/usr/bin/env node

import 'babel-polyfill'
import processOptions from './options'
import processEnv from './env'
import initFileLogger from './file_logger'
import {initCache} from './cache'
import makeCachedAttachmentLoader from './loader'
import {makeAttachmentsHandler} from './attachments'
import makeCommandRunner from './command'
import {
  initVkBot,
  makeInboxUpdateHandler,
  makeEchoMessageHandler,
  makeJoinRequester,
} from './vk_bot'

processOptions()
processEnv()

initFileLogger()
  .then(() => initCache())
  .then(cache => {
    let message_handler = makeEchoMessageHandler(
      makeCommandRunner(
        makeAttachmentsHandler(makeCachedAttachmentLoader(cache)),
      ),
    )
    if (process.env.VK_BOT_REQUIRE_JOIN === 'TRUE') {
      message_handler = makeJoinRequester(message_handler)
    }

    initVkBot(makeInboxUpdateHandler(message_handler))
  })
