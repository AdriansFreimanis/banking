import React from 'react'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import {Control, FieldPath, Form} from 'react-hook-form'
import z from 'zod';
import { authformSchema } from '@/lib/utils';

interface CustomInputProps {
    control:  Control<z.infer<typeof authformSchema>> ,            
    name: FieldPath<z.infer<typeof authformSchema>>,
    label: string;
    placeholder?: string;
    type: string;
}

const CustomInput = ({control,name,label,placeholder,type}: CustomInputProps) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel className='form-label'>
                        {label}
                    </FormLabel>
                    <div className='flex w-full flex-col'>
                        <FormControl>
                            <Input
                                placeholder={placeholder}
                                className='input-class'
                                type={type}
                                {...field}
                            />
                        </FormControl>
                        <FormMessage
                            className='form-message mt-2'
                        />
                    </div>
                </FormItem>
            )}
        />
    )
}

export default CustomInput