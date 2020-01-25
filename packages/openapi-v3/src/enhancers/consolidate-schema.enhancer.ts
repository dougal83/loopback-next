import {bind} from '@loopback/core';
import jsonmergepatch from 'json-merge-patch';
import compare from 'json-schema-compare';
import _ from 'lodash';
import {
  ISpecificationExtension,
  isSchemaObject,
  OpenApiSpec,
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
    const ctx: ConsolidateContext = {spec, updates: {paths: {}, refs: {}}};
    const patch = this.consolidateSchemaObjects(ctx);
    jsonmergepatch.apply(spec, patch);

    return spec;
  }

  /**
   *  Recursively search OpenApiSpec PathsObject for SchemaObjects with title property.
   *  Move reusable schema bodies to #/components/schemas and replace with json pointer.
   *  Handles title collisions with schema body comparison.
   *
   */
  private consolidateSchemaObjects(ctx: ConsolidateContext): object {
    // use paths as root
    this.recursiveWalk(ctx.spec.paths, ['paths'], ctx);
    return jsonmergepatch.merge(ctx.updates.refs, ctx.updates.paths);
  }

  // TODO(dougal83): perhaps replace foreach, look for known keys that can have ref
  private recursiveWalk(
    rootSchema: ISpecificationExtension,
    parentPath: Array<string>,
    ctx: ConsolidateContext,
  ) {
    if (rootSchema && typeof rootSchema === 'object') {
      Object.entries(rootSchema).forEach(([key, subSchema]) => {
        if (subSchema) {
          this.preProcessSchema(subSchema);
          this.recursiveWalk(subSchema, parentPath.concat(key), ctx);
          this.postProcessSchema(subSchema, parentPath.concat(key), ctx);
        }
      });
    }
  }

  /**
   * TODO(dougal83): REMOVE, improve array template.
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
   * set then we consider current schema for consolidation. SchemaObjects with
   * properties (and title set) are moved to #/components/schemas/<title> and
   * replaced with ReferenceObject.
   *
   * Features:
   *  - name collision protection
   *
   * @param schema - current schema element to process
   * @param parentPath - object path to parent
   * @param ctx - context object holding working data
   *
   */
  private postProcessSchema(
    schema: SchemaObject | ReferenceObject,
    parentPath: Array<string>,
    ctx: ConsolidateContext,
  ) {
    // use title to discriminate references
    if (isSchemaObject(schema) && schema.properties && schema.title) {
      // name collison protection
      let instanceNo = 1;
      let title = schema.title;
      let refSchema = this.getRefSchema(title, ctx);
      while (
        refSchema &&
        !compare(schema as ISpecificationExtension, refSchema, {
          ignore: ['description'],
        })
      ) {
        title = `${schema.title}${instanceNo++}`;
        refSchema = this.getRefSchema(title, ctx);
      }
      if (!refSchema) {
        this.createRefPatch(title, schema, ctx);
      }
      this.createPathPatch(title, parentPath, ctx);
    }
  }

  private getRefSchema(
    name: string,
    ctx: ConsolidateContext,
  ): ISpecificationExtension | undefined {
    const schema =
      _.get(ctx.spec, ['components', 'schemas', name]) ||
      _.get(ctx.updates.refs, ['components', 'schemas', name]);

    return schema;
  }
  private createRefPatch(
    name: string,
    value: ISpecificationExtension,
    ctx: ConsolidateContext,
  ) {
    _.setWith(
      ctx.updates.refs,
      ['components', 'schemas', name],
      value,
      _.partial(Object, null),
    );
  }
  private createPathPatch(
    name: string,
    path: Array<string>,
    ctx: ConsolidateContext,
  ) {
    const source = _.get(ctx.spec, path);
    const target = {
      $ref: `#/components/schemas/${name}`,
    };
    const patch = jsonmergepatch.generate(source, target);
    _.setWith(ctx.updates.paths, path, patch, _.partial(Object, null));
  }
}

/**
 * Type description for consolidation context
 */
interface ConsolidateContext {
  spec: OpenApiSpec;
  updates: {
    paths: object;
    refs: object;
  };
}
