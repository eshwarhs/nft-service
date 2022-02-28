'use strict';
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.updateNFT = async (event) => {
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

    if (event.pathParameters == null || event.pathParameters.nftId == null || event.pathParameters.nftId == "") {
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
        let nftId = event.pathParameters.nftId;
        let params = {
            TableName: table,
            Key: {
                "nftId": nftId
            }
        };
        let query_params = {
            TableName: table,
            FilterExpression: 'nftId = :nftId',
            ExpressionAttributeValues: { ':nftId': nftId }
        };
        try {
            let query_result = await docClient.scan(query_params).promise();
            console.log(query_result);
            if (query_result.Items.length > 0) {
                //let result = await docClient.delete(params).promise();
                //console.log(result);
                return {
                    statusCode: 200,
                    body: JSON.stringify(
                        {
                            message: 'NFT updated'
                        },
                        null,
                        2
                    ),
                };
            }
            else {
                return {
                    statusCode: 404,
                    body: JSON.stringify(
                        {
                            errors: [
                                {
                                    message: 'Invalid nftId'
                                }
                            ]
                        },
                        null,
                        2
                    ),
                };
            }
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
}