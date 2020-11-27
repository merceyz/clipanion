import { StrictValidator } from "typanion";
import { NoLimits } from "../../core";
import { applyValidator, CommandOptionReturn, GeneralFlags, makeCommandOption, rerouteArguments } from "./utils";

export type StringOptionNoBoolean<T> = GeneralFlags & {
  validator?: StrictValidator<unknown, T>,
  tolerateBoolean?: false,
  arity?: number,
};

export type StringOptionTolerateBoolean<T> = GeneralFlags & {
  validator?: StrictValidator<unknown, T>,
  tolerateBoolean: boolean,
  arity?: 1,
};

export type StringOption<T> =
  | StringOptionNoBoolean<T>
  | StringOptionTolerateBoolean<T>;

export type StringPositionalFlags<T> = {
  validator?: StrictValidator<unknown, T>,
  name?: string,
  required?: boolean,
};

function StringOption<T = string>(descriptor: string, opts?: StringOptionTolerateBoolean<T>): CommandOptionReturn<T | boolean | undefined>;
function StringOption<T = string>(descriptor: string, initialValue: string | boolean, opts?: StringOptionTolerateBoolean<T>): CommandOptionReturn<T | boolean>;
function StringOption<T = string>(descriptor: string, opts?: StringOptionNoBoolean<T>): CommandOptionReturn<T | undefined>;
function StringOption<T = string>(descriptor: string, initialValue: string, opts?: StringOptionNoBoolean<T>): CommandOptionReturn<T>;
function StringOption<T = string>(descriptor: string, initialValueBase: StringOption<T> | string | boolean | undefined, optsBase?: StringOption<T>) {
    const [initialValue, opts] = rerouteArguments(initialValueBase, optsBase ?? {});
    const {arity = 1} = opts;

    const optNames = descriptor.split(`,`);
    const nameSet = new Set(optNames);

    return makeCommandOption({
        definition(builder) {
            builder.addOption({
                names: optNames,

                arity: opts.tolerateBoolean ? 0 : arity,

                hidden: opts.hidden,
                description: opts.description,
            });
        },

        transformer(builder, key, state) {
            let currentValue = initialValue;

            for (const {name, value} of state.options) {
                if (!nameSet.has(name))
                    continue;

                currentValue = value;
            }

            return applyValidator(key, currentValue, opts.validator);
        }
    });
}

function StringPositional(): CommandOptionReturn<string>;
function StringPositional<T = string>(opts: Omit<StringPositionalFlags<T>, 'required'>): CommandOptionReturn<T>;
function StringPositional<T = string>(opts: StringPositionalFlags<T> & {required: false}): CommandOptionReturn<T | undefined>;
function StringPositional<T = string>(opts: StringPositionalFlags<T>): CommandOptionReturn<T | undefined>;
function StringPositional<T = string>(opts: StringPositionalFlags<T> = {}) {
    const {required = true} = opts;

    return makeCommandOption({
        definition(builder, key) {
            builder.addPositional({
                name: opts.name ?? key,
                required: opts.required,
            });
        },

        transformer(builder, key, state) {
            for (let i = 0; i < state.positionals.length; ++i) {
                // We skip NoLimits extras. We only care about
                // required and optional finite positionals.
                if (state.positionals[i].extra === NoLimits)
                    continue;

                // We skip optional positionals when we only
                // care about required positionals.
                if (required && state.positionals[i].extra === true)
                    continue;

                // We skip required positionals when we only
                // care about optional positionals.
                if (!required && state.positionals[i].extra === false)
                    continue;

                // We remove the positional from the list
                const [positional] = state.positionals.splice(i, 1);

                return positional.value;
            }
        }
    });
}


/**
 * Used to annotate positional options. Such options will be strings
 * unless they are provided a schema, which will then be used for coercion.
 * 
 * Be careful: this function is order-dependent! Make sure to define your
 * positional options in the same order you expect to find them on the
 * command line.
 */
export function String(): CommandOptionReturn<string>;
export function String<T = string>(opts: Omit<StringPositionalFlags<T>, 'required'>): CommandOptionReturn<T>;
export function String<T = string>(opts: StringPositionalFlags<T> & {required: false}): CommandOptionReturn<T | undefined>;
export function String<T = string>(opts: StringPositionalFlags<T>): CommandOptionReturn<T | undefined>;

/**
 * Used to annotate string options. Such options will be typed as strings
 * unless they are provided a schema, which will then be used for coercion.
 * 
 * @example
 * --foo=hello --bar world
 *     ► {"foo": "hello", "bar": "world"}
 */
export function String<T = string>(descriptor: string, opts?: StringOptionTolerateBoolean<T>): CommandOptionReturn<T | boolean | undefined>;
export function String<T = string>(descriptor: string, initialValue: string | boolean, opts?: StringOptionTolerateBoolean<T>): CommandOptionReturn<T | boolean>;
export function String<T = string>(descriptor: string, opts?: StringOptionNoBoolean<T>): CommandOptionReturn<T | undefined>;
export function String<T = string>(descriptor: string, initialValue: string, opts?: StringOptionNoBoolean<T>): CommandOptionReturn<T>;

// This function is badly typed, but it doesn't matter because the overloads provide the true public typings
export function String(descriptor?: unknown, ...args: any[]) {
    if (typeof descriptor === `string`) {
        return StringOption(descriptor, ...args);
    } else {
        return StringPositional(descriptor as any);
    }
}