'use strict';
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();

module.exports.listAllNFTs = async (event) => {
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

    if (!event.queryStringParameters || (event.queryStringParameters && !event.queryStringParameters.ownerId)) {
        return {
            statusCode: 404,
            body: JSON.stringify(
                {
                    errors: [
                        {
                            message: 'The query parameter "ownerId" is required.'
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
            FilterExpression: 'ownerId = :ownerId AND statuss <> :status ',
            ExpressionAttributeValues: {
                ':ownerId': event.queryStringParameters.ownerId, 
                ':status': 'archived'
            }
        };
        try {
            let result = await docClient.scan(params).promise();
            return {
                statusCode: 200,
                body: JSON.stringify(
                    {
                        message: 'NFTs retrieved successfully',
                        data: result.Items
                    },
                    null,
                    2
                ),
            };
        } catch (error) {
            console.error("Error - "+error);
            return {
                statusCode: 400,
                body: JSON.stringify(
                    {
                        errors: [
                            {
                                message: 'Failed to retrieve NFTs'
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
