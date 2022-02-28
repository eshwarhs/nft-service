'use strict';
const AWS = require('aws-sdk');

const Ajv = require("ajv");
const docClient = new AWS.DynamoDB.DocumentClient();

function validate_input(req_body) {
    const ajv = new Ajv({ allErrors: true });
    require("ajv-errors")(ajv);

    const schema = {
        type: "object",
        required: [
            "recepientId"
        ],
        properties: {
            recepientId: {
                type: "string",
                description: "Recepient of the NFT",
                pattern: "^[a-zA-Z0-9-_]*$",
                maxLength: 21
            }
        },
        additionalProperties: false,
        errorMessage: {
            required: {
                recepientId: "missing request parameter : recepientId"
            },
        }
    }
    const validate = ajv.compile(schema);
    const valid = validate(req_body)
    if (!valid) {
        console.log(validate.errors)
        return validate.errors;
    }
}

module.exports.giftNFT = async (event) => {
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

    let request_body = JSON.parse(event.body);
    let response = validate_input(request_body);
    let errors = [];
    let finalErrors = [];
    let setErr = new Set();

    if (response != null) {
        errors = response.map(function (item) {
            let pathName = item.instancePath.split('/')
            let field = pathName[1]
            let message = `${field} ${item.message}`
            if (item.keyword == 'maxLength' || item.keyword == 'pattern' || item.keyword == 'enum') {
                return message
            }
            return item.message;
        });

        for (var i = 0; i < errors.length; i++) {
            setErr.add(errors[i]);
        }

        setErr.forEach(
            key => finalErrors.push({
                message: key,
            })
        );

        return {
            statusCode: 400,
            body: JSON.stringify(
                {
                    "errors": finalErrors
                },
                null,
                2
            ),
        };
    }
    else {
        let table = "nftss";
        let nftId = event.pathParameters.nftId;
        let ownerId = token;
        let ts = new Date();
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
            if (query_result.Items.length > 0) {
                //call transaction API for creating transaction with type = transfer_nft
                return {
                    statusCode: 200,
                    body: JSON.stringify(
                        {
                            message: "NFT send request has been created successfully",
                            data: {
                                "nftId": nftId
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