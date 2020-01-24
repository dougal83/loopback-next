// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/openapi-v3
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  OpenApiSpecBuilder,
  OperationSpecBuilder,
} from '@loopback/openapi-spec-builder';
import {expect} from '@loopback/testlab';
import jsonmergepatch from 'json-merge-patch';
import {ConsolidationEnhancer} from '../../..';

const consolidationEnhancer = new ConsolidationEnhancer();

describe('consolidateSchemaObjects', () => {
  it('moves schema with title to component.schemas, replace with reference', () => {
    const inputSpec = new OpenApiSpecBuilder()
      .withOperation(
        'get',
        '/',
        new OperationSpecBuilder().withResponse(200, {
          description: 'Example',
          content: {
            'application/json': {
              schema: {
                title: 'loopback.example',
                properties: {
                  test: {
                    type: 'string',
                  },
                },
              },
            },
          },
        }),
      )
      .build();

    const expectedSpec = new OpenApiSpecBuilder()
      .withOperation(
        'get',
        '/',
        new OperationSpecBuilder().withResponse(200, {
          description: 'Example',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/loopback.example',
              },
            },
          },
        }),
      )
      .build();

    // TODO(dougal83): improve on patched test
    const expectedComponents = {
      components: {
        schemas: {
          'loopback.example': {
            title: 'loopback.example',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
    };
    jsonmergepatch.apply(expectedSpec, expectedComponents);

    expect(consolidationEnhancer.modifySpec(inputSpec)).to.eql(expectedSpec);
  });

  it('ignores schema without title property', () => {
    const inputSpec = new OpenApiSpecBuilder()
      .withOperation(
        'get',
        '/',
        new OperationSpecBuilder().withResponse(200, {
          description: 'Example',
          content: {
            'application/json': {
              schema: {
                properties: {
                  test: {
                    type: 'string',
                  },
                },
              },
            },
          },
        }),
      )
      .build();

    expect(consolidationEnhancer.modifySpec(inputSpec)).to.eql(inputSpec);
  });

  it('Avoids naming collision', () => {
    const inputSpec = new OpenApiSpecBuilder()
      .withOperation(
        'get',
        '/',
        new OperationSpecBuilder().withResponse(200, {
          description: 'Example',
          content: {
            'application/json': {
              schema: {
                title: 'loopback.example',
                properties: {
                  test: {
                    type: 'string',
                  },
                },
              },
            },
          },
        }),
      )
      .build();

    // TODO(dougal83): improve on patched test
    const inputComponents = {
      components: {
        schemas: {
          'loopback.example': {
            title: 'Different loopback.example exists',
            properties: {
              testDiff: {
                type: 'string',
              },
            },
          },
        },
      },
    };
    jsonmergepatch.apply(inputSpec, inputComponents);

    const expectedSpec = new OpenApiSpecBuilder()
      .withOperation(
        'get',
        '/',
        new OperationSpecBuilder().withResponse(200, {
          description: 'Example',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/loopback.example1',
              },
            },
          },
        }),
      )
      .build();

    // TODO(dougal83): improve on patched test
    const expectedComponents = {
      components: {
        schemas: {
          'loopback.example': {
            title: 'Different loopback.example exists',
            properties: {
              testDiff: {
                type: 'string',
              },
            },
          },
          'loopback.example1': {
            title: 'loopback.example',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
    };
    jsonmergepatch.apply(expectedSpec, expectedComponents);

    expect(consolidationEnhancer.modifySpec(inputSpec)).to.eql(expectedSpec);
  });

  it('If array items has no title, copy parent title if exists', () => {
    const inputSpec = new OpenApiSpecBuilder()
      .withOperation(
        'get',
        '/',
        new OperationSpecBuilder().withResponse(200, {
          description: 'Example',
          content: {
            'application/json': {
              schema: {
                myarray: {
                  title: 'MyArray',
                  type: 'array',
                  items: {
                    properties: {
                      test: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      )
      .build();

    const expectedSpec = new OpenApiSpecBuilder()
      .withOperation(
        'get',
        '/',
        new OperationSpecBuilder().withResponse(200, {
          description: 'Example',
          content: {
            'application/json': {
              schema: {
                myarray: {
                  title: 'MyArray',
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/MyArray.Items',
                  },
                },
              },
            },
          },
        }),
      )
      .build();

    // TODO(dougal83): improve on patched test
    const expectedComponents = {
      components: {
        schemas: {
          'MyArray.Items': {
            title: 'MyArray.Items',
            properties: {
              test: {
                type: 'string',
              },
            },
          },
        },
      },
    };
    jsonmergepatch.apply(expectedSpec, expectedComponents);

    expect(consolidationEnhancer.modifySpec(inputSpec)).to.eql(expectedSpec);
  });
});
