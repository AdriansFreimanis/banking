import React from 'react'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { Input } from './ui/input'
import {Control, FieldPath, Form} from 'react-hook-form'
import z from 'zod';
import { authformSchema } from '@/lib/utils';

const formSchema = authformSchema('sign-up')

interface CustomInputProps {
    control:  Control<z.infer<typeof formSchema>> ,            
    name: FieldPath<z.infer<typeof formSchema>>,
    label: string;
    placeholder?: string;
    
}

const CustomInput = ({control,name,label,placeholder}: CustomInputProps) => {
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
                                className={`input-class`}
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