'use strict';
const AWS = require('aws-sdk');
const https = require('https')

const docClient = new AWS.DynamoDB.DocumentClient();

function call_trxAPI(data) {
    var post_data = JSON.stringify(data);
  
    var post_options = {
        host: 'sf8yknn5dc.execute-api.us-east-1.amazonaws.com',
        port: '80',
        path: '/transactions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
  
    var post_req = https.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('Response: ' + chunk);
        });
    });
  
    post_req.write(post_data);
    post_req.end();
  }

module.exports.claimNFT = async (event) => {
    let token = '';
    if (event.headers.Authorization) {
        token = event.headers.Authorization.split(' ')[1];
        if (token != "testtoken1") {
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
    else if (event.pathParameters == null || event.pathParameters.claimToken == null || event.pathParameters.claimToken == "") {
        return {
            statusCode: 404,
            body: JSON.stringify(
                {
                    errors: [
                        {
                            message: 'The path parameter "claimToken" is required.'
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
        let claimToken = event.pathParameters.claimToken;
        let ownerId = token;
        let ts = new Date();
        let params = {
            TableName: table,
            Key: {
                "nftId": nftId
            },
            UpdateExpression: "set ownerId = :ownerId, updated = :ts",
            ExpressionAttributeValues: {
                ":ownerId": ownerId,
                ":ts": ts.toISOString()
            },
        };
        let query_params = {
            TableName: table,
            FilterExpression: 'nftId = :nftId AND statuss <> :status',
            ExpressionAttributeValues: {
                ':nftId': nftId,
                ':status': 'archived'
            }
        };
        try {
            let query_result = await docClient.scan(query_params).promise();
            console.log(query_result);
            if (query_result.Items.length > 0) {    //check if claimToken is valid. aussumed for now that it will be valid
                let senderId = query_result.Items[0].ownerId;
                let result = await docClient.update(params).promise();
                console.log(result);
                //call transaction API for creating transaction with type = transfer_nft
                let trx_req = {
                    "senderWalletId": senderId,
                    "receiverWalletId": token,
                    "type": "claim_nft",
                    "statuss": "pending"
                }
                //call the createTransaction api here
                //call_trxAPI(trx_req);
                return {
                    statusCode: 200,
                    body: JSON.stringify(
                        {
                            message: 'NFT claimed successfully',
                            data: {
                                "nftId": nftId,
                                "claimToken": claimToken
                            }
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