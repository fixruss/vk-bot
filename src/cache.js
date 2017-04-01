import Loki from 'lokijs'
import util from 'util'
import logger from './logger'
import path from 'path'
import os from 'os'
import mkdirp from 'mkdirp'

export class Cache {
  file
  db
  collection

  constructor(filename) {
    this.file = filename
    this.db = new Loki(filename)
  }

  load() {
    return new Promise((resolve, reject) => this.db.loadDatabase({}, error => {
        error === null ? resolve() : reject(error)
      }))
      .then(() => {
        logger.info(`cache file ${util.inspect(this.file)} has been loaded`)

        this.collection = this._getCollection()
        return this
      })
      .catch(error => {
        logger.error(
          `unable to load cache file ${util.inspect(this.file)}: `
            + util.inspect(error),
        )

        process.exit(1)
      })
  }

  save() {
    return new Promise((resolve, reject) => this.db.saveDatabase(error => {
        error === null ? resolve() : reject(error)
      }))
      .then(() => {
        logger.info(`cache file ${util.inspect(this.file)} has been saved`)
        return this
      })
      .catch(error => {
        logger.warn(
          `unable to save cache file ${util.inspect(this.file)}: `
            + util.inspect(error),
        )
      })
  }

  get(attachment_path, exactly) {
    const {dir, base} = path.parse(attachment_path)
    let query = {
      'file.name': base,
    }
    if (exactly) {
      query = {
        $and: [query, {
          'file.path': dir,
        }],
      }
    }

    return this.collection.findOne(query)
  }

  add(attachment_id, attachment_path) {
    const {dir, base} = path.parse(attachment_path)
    this.collection.insert({
      attachment: attachment_id,
      file: {
        path: dir,
        name: base,
      },
    })

    return this
  }

  debug() {
    logger.debug(`cache: ${util.inspect(this.collection.find({}))}`)
    return this
  }

  _getCollection() {
    let collection = this.db.getCollection('attachments')
    if (collection === null) {
      collection = this.db.addCollection('attachments')
    }

    return collection
  }
}

function readCacheFilename() {
  return process.env.VK_BOT_CACHE
    || path.join(os.homedir(), '.vk-bot', 'attachments.json')
}

function createCacheDirectory(path) {
  return new Promise((resolve, reject) => mkdirp(path, (error, made) => {
      error === null ? resolve(made) : reject(error)
    }))
    .then(made => {
      if (made !== null) {
        logger.info(`cache directory ${util.inspect(path)} has been created`)
      }
    })
    .catch(error => {
      logger.error(
        `unable to create cache directory ${util.inspect(path)}: `
          + util.inspect(error),
      )

      process.exit(1)
    })
}

export function initCache() {
  const cache_filename = readCacheFilename()
  return createCacheDirectory(path.dirname(cache_filename))
    .then(() => new Cache(cache_filename).load())
}
