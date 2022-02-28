'use strict';
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.getNFTDetails = async (event) => {
  if (event.headers.Authorization) {
    let token = event.headers.Authorization.split(' ')[1];
    if (token != "testtoken") {
      return {
        statusCode: 401,
        body: JSON.stringify(
          {
            errors: [
              {
                message: 'You are not authorized to perform this operation'
              }
            ]
          },
          null,
          2
        ),
      };
    }
  }
  else {
    return {
      statusCode: 401,
      body: JSON.stringify(
        {
          errors: [
            {
              message: 'You are not authenticated'
            }
          ]
        },
        null,
        2
      ),
    };
  }

  if (event.pathParameters == null ||  event.pathParameters.nftId == null ||  event.pathParameters.nftId == "") {
    return {
      statusCode: 404,
      body: JSON.stringify(
        {
          errors: [
            {
              message: 'The path parameter "nftId" is required.'
            }
          ]
        },
        null,
        2
      ),
    };
  }
  else {
    let table = "nftss";
    let params = {
      TableName: table,
      FilterExpression: 'nftId = :nftId',
      ExpressionAttributeValues: { ':nftId': event.pathParameters.nftId }
    };
    try {
      let result = await docClient.scan(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify(
          {
            message: 'NFT retrieved successfully',
            data: result.Items
          },
          null,
          2
        ),
      };
    } catch (error) {
      console.log(error);
      return {
        statusCode: 400,
        body: JSON.stringify(
          {
            errors: [
              {
                message: 'Server Error!'
              }
            ]
          },
          null,
          2
        ),
      };
    }
  }
};
