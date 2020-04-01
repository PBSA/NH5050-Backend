import AWS from 'aws-sdk';
import BaseConnection from './abstracts/base.connection';

export default class AwsConnection extends BaseConnection {

  connect() {
    this.s3 = new AWS.S3();
  }

  disconnect() {}

}
