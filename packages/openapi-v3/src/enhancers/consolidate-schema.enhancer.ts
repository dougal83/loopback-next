import {bind} from '@loopback/core';
import compare from 'json-schema-compare';
import _ from 'lodash';
import {
  ISpecificationExtension,
  isSchemaObject,
  OpenApiSpec,
  PathsObject,
  ReferenceObject,
  SchemaObject,
} from '../types';
import {asSpecEnhancer, OASEnhancer} from './types';

/**
 * A spec enhancer to consolidate OpenAPI specs
 *
 */
@bind(asSpecEnhancer)
export class ConsolidationEnhancer implements OASEnhancer {
  name = 'consolidate';

  modifySpec(spec: OpenApiSpec): OpenApiSpec {
    const ctx: ConsolidateContext = {
      paths: _.cloneDeep(spec.paths),
      refs:
        spec.components && spec.components.schemas
          ? _.cloneDeep(spec.components.schemas)
          : {},
    };
    const updatedSpec = this.consolidateSchemaObjects(spec, ctx);

    return updatedSpec;
  }

  /**
   *  Recursively search OpenApiSpec PathsObject for SchemaObjects with title property.
   *  Move reusable schema bodies to #/components/schemas and replace with json pointer.
   *  Handles collisions /w title, schema body pair comparision.
   *
   */
  private consolidateSchemaObjects(
    spec: OpenApiSpec,
    ctx: ConsolidateContext,
  ): OpenApiSpec {
    this.recursiveWalk(ctx.paths, ctx);

    const updatedSpec = {
      ...spec,
      ...{
        paths: ctx.paths,
        components: {...spec.components, ...{schemas: ctx.refs}},
      },
    };

    // tidy up empty objects
    if (Object.keys(updatedSpec.components.schemas).length === 0) {
      delete updatedSpec.components.schemas;
    }
    if (Object.keys(updatedSpec.components).length === 0) {
      delete updatedSpec.components;
    }

    return updatedSpec;
  }

  private recursiveWalk(
    rootSchema: ISpecificationExtension,
    ctx: ConsolidateContext,
  ) {
    if (rootSchema && typeof rootSchema === 'object') {
      Object.entries(rootSchema).forEach(([key, subSchema]) => {
        if (subSchema) {
          this.preProcessSchema(subSchema);
          this.recursiveWalk(subSchema, ctx);
          const updatedSchema = this.postProcessSchema(subSchema, ctx);
          if (updatedSchema) {
            rootSchema[key] = updatedSchema;
          }
        }
      });
    }
  }

  /**
   * Prepare current schema for processing before further tree traversal.
   *
   * Features:
   *  - ensure schema array items can be consolidated if parent array has
   *    title set.
   *
   * @param schema - current schema element to prepare for processing
   *
   */
  private preProcessSchema(schema: SchemaObject | ReferenceObject) {
    // ensure schema array items can be consolidated
    if (isSchemaObject(schema) && schema.items && schema.title) {
      if (isSchemaObject(schema.items) && !schema.items.title) {
        schema.items = {
          title: `${schema.title}.Items`,
          ...schema.items,
        };
      }
    }
  }

  /**
   * Carry out schema consolidation after tree traversal. If 'title' property
   * set then we consider current schema for consoildation. SchemaObjects with
   * properties (and title set) are moved to #/components/schemas/<title> and
   * replaced with ReferenceObject.
   *
   * Features:
   *  - name collision protection
   *
   * @param schema - current schema element to process
   * @param ctx - context object holding working data
   *
   */
  private postProcessSchema(
    schema: SchemaObject | ReferenceObject,
    ctx: ConsolidateContext,
  ): ReferenceObject | undefined {
    // use title to discriminate references
    if (isSchemaObject(schema) && schema.properties && schema.title) {
      // name collison protection
      let instanceNo = 1;
      let title = schema.title;
      while (
        this.refExists(title, ctx) &&
        !compare(
          schema as ISpecificationExtension,
          this.getRefValue(title, ctx),
          {
            ignore: ['description'],
          },
        )
      ) {
        title = `${schema.title}${instanceNo++}`;
      }
      // only add new reference schema
      if (!this.refExists(title, ctx)) {
        this.setRefValue(title, schema, ctx);
      }
      return <ReferenceObject>{$ref: `#/components/schemas/${title}`};
    }
    return undefined;
  }

  private refExists(name: string, ctx: ConsolidateContext): boolean {
    return _.has(ctx.refs, name);
  }
  private getRefValue(
    name: string,
    ctx: ConsolidateContext,
  ): ISpecificationExtension {
    return ctx.refs[name];
  }
  private setRefValue(
    name: string,
    value: ISpecificationExtension,
    ctx: ConsolidateContext,
  ) {
    ctx.refs[name] = value;
  }
}

/**
 * Type description for consolidation context
 */
interface ConsolidateContext {
  paths: PathsObject;
  refs: {
    [schema: string]: SchemaObject | ReferenceObject;
  };
}
