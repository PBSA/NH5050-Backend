import multer from 'multer';
import multerS3 from 'multer-s3';
import config from 'config';
import path from 'path';
import randomString from 'randomstring';
import Stream from 'stream';
import ValidateError from './../errors/validate.error';

const S3_BUCKET_NAME = config.get('s3.bucket');
const CDN_URL = config.get('cdnUrl');

export default class FileService {

  constructor(conns) {
    this.awsConnection = conns.awsConnection;

    this.IMAGE_FORMATS = ['jpeg', 'png'];
    this.FILE_SIZE_LIMIT = 1048576;

    this.errors = {
      INVALID_IMAGE_FORMAT: 'Invalid image format',
      FILE_NOT_FOUND: 'File not found',
      IMAGE_STRING_TOO_LONG: 'value too long for type character varying(255)',
      INVALID_REQUEST: 'Invalid request',
      FILE_TOO_LARGE: 'File too large'
    };
  }

  createUploadStream(path) {
    const stream = new Stream.PassThrough();
    const promise = this.awsConnection.s3.upload({
      Bucket: S3_BUCKET_NAME,
      Key: path,
      Body: stream
    }).promise();

    return {
      stream,
      promise
    };
  }

  /**
   *
   * @param {Object} req
   * @param {Object} res
   * @return Promise<>
   */
  async saveImage(req, res) {

    try {
      const upload = multer({
        storage: multerS3({
          s3: this.awsConnection.s3,
          bucket: S3_BUCKET_NAME,
          key: this._filename
        }),
        limits: {
          files: 1, // allow only 1 file per request
          fileSize: this.FILE_SIZE_LIMIT // 1 MB (max file size)
        },
        fileFilter: this._imageFilter.bind(this)
      }).single('file');

      await new Promise((success, fail) => {
        upload(req, res, (err, res) => err ? fail(err) : success(res));
      });
    } catch (e) {
      throw ValidateError.validateError({file: e.message});
    }

    if(!req.file) {
      throw new Error(this.errors.FILE_NOT_FOUND);
    }

    return CDN_URL + new URL(req.file.location).pathname;
  }

  /**
   *
   * @param {String} fileName
   * @return Promise<>
   */
  delete(fileName) {
    return new Promise((resolve, reject) => {
      this.awsConnection.s3.deleteObject({
        Bucket: S3_BUCKET_NAME,
        Key: fileName
      }, (err, data) => err ? reject(err) : resolve(data));
    });
  }

  /**
   *
   * @param {Object} req
   * @param {Object} file
   * @param {Function} done
   * @private
   */
  _filename(req, file, done) {
    const ext = path.extname(file.originalname);
    const name = `pics/${randomString.generate(10)}-${randomString.generate(13)}-${randomString.generate(8)}${ext}`;
    done(null, name);
  }

  /**
   *
   * @param {Object} req
   * @param {Object} file
   * @param {Function} done
   * @private
   */
  _imageFilter(req, file, done) {
    const mimeMatch = file.mimetype.match(new RegExp(`(${this.IMAGE_FORMATS.join('|')})$`));

    if (!mimeMatch) {
      done(new Error(this.errors.INVALID_IMAGE_FORMAT));
    }

    done(null, mimeMatch);
  }

}
