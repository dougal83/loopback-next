// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/openapi-v3
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {expect} from '@loopback/testlab';
import {ConsolidationEnhancer, OpenAPIObject} from '../../..';

const consolidationEnhancer = new ConsolidationEnhancer();

describe('consolidateSchemaObjects', () => {
  it('moves schema with title to component.schemas, replace with reference', () => {
    const inputSpec: OpenAPIObject = {
      openapi: '',
      info: {
        title: '',
        version: '',
      },
      paths: {
        schema: {
          title: 'loopback.example',
          properties: {
            test: {
              type: 'string',
            },
          },
        },
      },
    };
    const expectedSpec: OpenAPIObject = {
      openapi: '',
      info: {
        title: '',
        version: '',
      },
      paths: {
        schema: {
          $ref: '#/components/schemas/loopback.example',
        },
      },
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
    expect(consolidationEnhancer.modifySpec(inputSpec)).to.eql(expectedSpec);
  });

  it('ignores schema without title property', () => {
    const inputSpec: OpenAPIObject = {
      openapi: '',
      info: {
        title: '',
        version: '',
      },
      paths: {
        schema: {
          properties: {
            test: {
              type: 'string',
            },
          },
        },
      },
    };
    expect(consolidationEnhancer.modifySpec(inputSpec)).to.eql(inputSpec);
  });

  it('Avoids naming collision', () => {
    const inputSpec: OpenAPIObject = {
      openapi: '',
      info: {
        title: '',
        version: '',
      },
      paths: {
        schema: {
          title: 'loopback.example',
          properties: {
            test: {
              type: 'string',
            },
          },
        },
      },
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
    const expectedSpec: OpenAPIObject = {
      openapi: '',
      info: {
        title: '',
        version: '',
      },
      paths: {
        schema: {
          $ref: '#/components/schemas/loopback.example1',
        },
      },
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
    expect(consolidationEnhancer.modifySpec(inputSpec)).to.eql(expectedSpec);
  });

  it('If array items has no title, copy parent title if exists', () => {
    const inputSpec: OpenAPIObject = {
      openapi: '',
      info: {
        title: '',
        version: '',
      },
      paths: {
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
    };
    const expectedSpec: OpenAPIObject = {
      openapi: '',
      info: {
        title: '',
        version: '',
      },
      paths: {
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
    expect(consolidationEnhancer.modifySpec(inputSpec)).to.eql(expectedSpec);
  });
});
