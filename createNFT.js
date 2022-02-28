'use strict';

const Ajv = require("ajv");
const AWS = require('aws-sdk');

const docClient = new AWS.DynamoDB.DocumentClient();
var { nanoid } = require("nanoid");

function validate_input(req_body) {
    const ajv = new Ajv({ allErrors: true });
    require("ajv-errors")(ajv);

    const schema = {
        type: "object",
        required: [
            "title",
            "collectionId",
            "categoryId",
            "filePath",
        ],
        properties: {
            title: {
                type: "string",
                description: "The NFT Title",
                maxLength: 200
            },
            collectionId: {
                type: "string",
                description: "The collection under which the NFT will be created"
            },
            categoryId: {
                type: "string",
                description: "The NFT category"
            },
            filePath: {
                type: "string",
                description: "The image url of the NFT"
            },
            description: {
                type: "string",
                description: "A short description of the NFT",
                maxLength: 1000
            },
            tags: {
                type: "array",
                uniqueItems: true,
                description: "Array of strings containing the recipient IDs",
                items: {
                    type: "string"
                }
            }
        },
        additionalProperties: false,
        errorMessage: {
            required: {
                title: "missing request parameter : title",
                collectionId: "missing request parameter : collectionId",
                categoryId: "missing request parameter : categoryId",
                filePath: "missing request parameter : filePath",
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

module.exports.createNFT = async (event) => {
    let token = '';
    if (event.headers.Authorization) {
        token = event.headers.Authorization.split(' ')[1];
        if (token != "testtoken") {  //hardcoded since authorizer lamba will validate it
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
        try {
            let nftId = nanoid();
            let ts = new Date();
            let record = {
                "nftId": nftId,
                "title": request_body.title,
                "description": request_body.description != null ? request_body.description : "",
                "tags": request_body.tags != null ? request_body.tags : [],
                "collectionId": request_body.collectionId,
                "categoryId": request_body.categoryId,
                "filePath": request_body.filePath,
                "ownerId": token,
                "statuss": "pending",
                "created": ts.toISOString(),
                "updated": ts.toISOString(),
            };

            let params = {
                TableName: 'nftss',
                Item: record
            };

            let result = await docClient.put(params).promise();
            return {
                statusCode: 201,
                body: JSON.stringify(

                    {
                        "message": "NFT created successfully",
                        "data": { "nftid": record.nftId }
                    },
                    null,
                    2
                ),
            };
        }
        catch (error) {
            console.log(error);
            return {
                statusCode: 400,
                body: JSON.stringify(
                    {
                        errors: [
                            {
                                "message": "Server error!"
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