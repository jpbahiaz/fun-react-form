import * as React from "react";

type BaseRecord = Record<string, string>;
type BaseAnyRecord = Record<string, any>;

type FalsishOrString = null | false | undefined | string | void;

type FunOptions<Values extends BaseRecord = BaseRecord> = {
  initialValues: Values;
  onSubmit: (values: Values) => void;
  validate: (values: Values) => Partial<Values>;
  validateFormOnChange?: boolean;
  renderOnChange?: boolean;
  setTouchedOnChange?: boolean;
  setTouchedOnSubmit?: boolean;
};

export type FieldOptions = {
  validate?: (value: string) => FalsishOrString;
  touchedOnChange?: boolean;
};

function changeProp(key: string, value: any, obj: Record<string, any>) {
  const props = key.split(".");

  props.reduce((prev, curr, index) => {
    if (index === props.length - 1) {
      prev[curr] = value;
    } else if (prev[curr] === undefined) {
      prev[curr] = {};
    }

    return prev[curr];
  }, obj);

  return obj;
}

function removeProps<T extends Record<string, any>>(
  props: (keyof T)[],
  obj: T,
): T {
  const result = {} as T;
  if (props && obj) {
    return Object.keys(obj)
      .filter((key) => !props.includes(key as keyof T))
      .reduce((prev, curr: keyof T) => {
        prev[curr] = obj[curr];
        return prev;
      }, result);
  }

  return result;
}

function setKeyValueState(
  key: string,
  value: any,
  setState: React.Dispatch<React.SetStateAction<any>>,
  pure = true,
) {
  if (pure) {
    setState((prev: BaseAnyRecord) => changeProp(key, value, { ...prev }));
  } else {
    setState((prev: BaseAnyRecord) => changeProp(key, value, prev));
  }
}

function setKeysToTrue(obj: Record<any, any>) {
  const res: Record<any, any> = {};
  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      res[key] = setKeysToTrue(obj[key]);
    } else {
      res[key] = true;
    }
  });

  return res;
}

function checkKeysForTruishValue(obj: Record<string, any>): boolean {
  return Object.keys(obj).reduce((prev, curr) => {
    if(typeof obj[curr] === "object") {
      return prev || checkKeysForTruishValue(obj[curr])
    } else {
      return prev || Boolean(obj[curr])
    }
  }, false)
}

export function useForm<FormValues extends BaseAnyRecord = BaseRecord>({
  initialValues,
  onSubmit,
  validate,
  validateFormOnChange = false,
  renderOnChange = true,
  setTouchedOnChange = true,
  setTouchedOnSubmit = true,
}: FunOptions<FormValues>): FunForm<FormValues> {
  const [values, setValues] = React.useState<FormValues>(initialValues);
  const [errors, setErrors] = React.useState<FormValues>({} as FormValues);
  const [touched, setTouched] = React.useState<
    Record<keyof FormValues, boolean>
  >({} as Record<keyof FormValues, boolean>);

  function handleSubmit() {
    const validationErrors = validate(values);

    if (setTouchedOnSubmit) {
      setTouched(() => setKeysToTrue(values));
    }

    const allErrors = { ...errors, ...validationErrors }
    const canSubmit = !checkKeysForTruishValue(allErrors)

    if (canSubmit) {
      onSubmit(values);
    } else {
      setErrors({ ...errors, ...validationErrors });
    }
  }

  function setFieldError(field: keyof FormValues, value: string) {
    if (value !== errors[field])
      setKeyValueState(field as string, value, setErrors);
  }

  function setFieldTouched(field: keyof FormValues, value: boolean) {
    if (value !== touched[field])
      setKeyValueState(field as string, value, setTouched);
  }

  function setFieldValue(
    field: keyof FormValues,
    value: string,
    options?: FieldOptions,
  ) {
    if (validateFormOnChange) {
      const validationErrors = validate(values);

      if (Object.keys(validationErrors).length) {
        setFieldError(field, validationErrors[field]);
      } else {
        setErrors((prev) => removeProps([field], prev));
      }
    }

    if (options) {
      if (options.validate) {
        const validationError = options.validate(value);
        if (validationError) {
          setFieldError(field, validationError);
        } else {
          setErrors((prev) => removeProps([field], prev));
        }
      }
    }

    if ((options && options.touchedOnChange) ?? setTouchedOnChange) {
      setFieldTouched(field, true);
    }

    if (!validateFormOnChange && !(options && options.validate)) {
      setErrors((prev) => removeProps([field], prev));
    }

    setKeyValueState(field as string, value, setValues, renderOnChange);
  }

  function validateField(
    field: keyof FormValues,
    validate: (value: string) => string,
  ) {
    const validationError = validate(values[field]);
    if (validationError) setFieldError(field, validationError);
  }

  function register(field: keyof FormValues, options?: FieldOptions) {
    return function onChange(value: string) {
      setFieldValue(field, value, options);
    };
  }

  function getValue(field: keyof FormValues) {
    return values[field];
  }

  return {
    register,
    handleSubmit,
    getValue,
    validateField,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    values,
    errors,
    touched,
  };
}

export type FunForm<FormValues> = {
  register: (
    field: keyof FormValues,
    options?: FieldOptions,
  ) => (value: string) => void;
  handleSubmit: () => void;
  getValue: (field: keyof FormValues) => FormValues[keyof FormValues];
  validateField: (
    field: keyof FormValues,
    validate: (value: string) => string,
  ) => void;
  setFieldValue: (
    field: keyof FormValues,
    value: string,
    options?: FieldOptions,
  ) => void;
  setFieldError: (field: keyof FormValues, value: string) => void;
  setFieldTouched: (field: keyof FormValues, value: boolean) => void;
  values: FormValues;
  errors: FormValues;
  touched: Record<keyof FormValues, boolean>;
};

export function checkRequiredFields<
  T extends Record<string, any>,
  K extends keyof T
>(
  fields: K[],
  values: Record<K, any>,
  error: Record<K, string>,
  message = "Campo obrigatório",
) {
  fields.reduce((prev, curr) => {
    if (!values[curr]) {
      prev[curr] = message;
    }
    return prev;
  }, error);
}
