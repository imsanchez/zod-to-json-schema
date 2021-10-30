import { ZodFirstPartyTypeKind, ZodTypeDef } from "zod";
import { JsonSchema7AnyType, parseAnyDef } from "./parsers/any";
import { JsonSchema7ArrayType, parseArrayDef } from "./parsers/array";
import { JsonSchema7BigintType, parseBigintDef } from "./parsers/bigint";
import { JsonSchema7BooleanType, parseBooleanDef } from "./parsers/boolean";
import { JsonSchema7DateType, parseDateDef } from "./parsers/date";
import { parseDefaultDef } from "./parsers/default";
import { parseEffectsDef } from "./parsers/effects";
import { JsonSchema7EnumType, parseEnumDef } from "./parsers/enum";
import {
  JsonSchema7AllOfType,
  parseIntersectionDef,
} from "./parsers/intersection";
import { JsonSchema7LiteralType, parseLiteralDef } from "./parsers/literal";
import { JsonSchema7MapType, parseMapDef } from "./parsers/map";
import {
  JsonSchema7NativeEnumType,
  parseNativeEnumDef,
} from "./parsers/nativeEnum";
import { JsonSchema7NeverType, parseNeverDef } from "./parsers/never";
import { JsonSchema7NullType, parseNullDef } from "./parsers/null";
import { JsonSchema7NullableType, parseNullableDef } from "./parsers/nullable";
import { JsonSchema7NumberType, parseNumberDef } from "./parsers/number";
import { JsonSchema7ObjectType, parseObjectDef } from "./parsers/object";
import { parsePromiseDef } from "./parsers/promise";
import { JsonSchema7RecordType, parseRecordDef } from "./parsers/record";
import { JsonSchema7SetType, parseSetDef } from "./parsers/set";
import { JsonSchema7StringType, parseStringDef } from "./parsers/string";
import { JsonSchema7TupleType, parseTupleDef } from "./parsers/tuple";
import {
  JsonSchema7UndefinedType,
  parseUndefinedDef,
} from "./parsers/undefined";
import { JsonSchema7UnionType, parseUnionDef } from "./parsers/union";
import { JsonSchema7UnknownType, parseUnknownDef } from "./parsers/unknown";
import { References } from "./References";

type JsonSchema7RefType = { $ref: string };

export type JsonSchema7Type = (
  | JsonSchema7StringType
  | JsonSchema7ArrayType
  | JsonSchema7NumberType
  | JsonSchema7BigintType
  | JsonSchema7BooleanType
  | JsonSchema7DateType
  | JsonSchema7EnumType
  | JsonSchema7LiteralType
  | JsonSchema7NativeEnumType
  | JsonSchema7NullType
  | JsonSchema7NumberType
  | JsonSchema7ObjectType
  | JsonSchema7RecordType
  | JsonSchema7TupleType
  | JsonSchema7UnionType
  | JsonSchema7UndefinedType
  | JsonSchema7RefType
  | JsonSchema7NeverType
  | JsonSchema7MapType
  | JsonSchema7AnyType
  | JsonSchema7NullableType
  | JsonSchema7AllOfType
  | JsonSchema7UnknownType
  | JsonSchema7SetType
) & { default?: any; description?: string };

export function parseDef(
  def: ZodTypeDef,
  refs: References
): JsonSchema7Type | undefined {
  const visited = checkIfVisited(def, refs);
  if (visited) return visited;
  const parsed = selectParser(def, (def as any).typeName, refs);
  if (parsed) addMeta(def, parsed);
  return parsed;
}

const checkIfVisited = (
  def: ZodTypeDef,
  refs: References
):
  | {
      $ref: string;
    }
  | {}
  | undefined => {
  const wasVisited = refs.visited.find((x) => Object.is(x.def, def));
  if (wasVisited) {
    switch (refs.$refStrategy) {
      case "root":
        return {
          $ref:
            wasVisited.path.length === 0
              ? ""
              : wasVisited.path.length === 1
              ? `${wasVisited.path[0]}/`
              : wasVisited.path.join("/"),
        };
      case "relative":
        return { $ref: makeRelativePath(refs.currentPath, wasVisited.path) };
      case "none": {
        if (
          wasVisited.path.length < refs.currentPath.length &&
          wasVisited.path.every(
            (value, index) => refs.currentPath[index] === value
          )
        ) {
          console.warn(
            `Recursive reference detected at ${refs.currentPath.join(
              "/"
            )}! Defaulting to any`
          );
          return {};
        }
      }
    }
  } else {
    refs.visited.push({ def, path: refs.currentPath });
  }
};

const makeRelativePath = (pathA: string[], pathB: string[]) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i]) break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};

const selectParser = (
  def: any,
  typeName: ZodFirstPartyTypeKind,
  refs: References
): JsonSchema7Type | undefined => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef();
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef();
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef();
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef(refs);
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def, refs);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseDef(def.innerType._def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return parseDef(def.getter()._def, refs);
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef();
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef();
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef();
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
      return undefined;
    default:
      return ((_: never) => undefined)(typeName);
  }
};

const addMeta = (def: ZodTypeDef, parsed: JsonSchema7Type): JsonSchema7Type => {
  if (def.description) parsed.description = def.description;
  return parsed;
};
