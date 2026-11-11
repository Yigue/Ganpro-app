'use client';
import {crearGenericos} from '@/app/(dashboard)/stock/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input} from '@/components/ui/input';
import {IntakeDefaults,type IntakeOptions} from './intake-defaults';
export function GenericForm(props:IntakeOptions){return <FormDialog title="Animales sin caravana" trigger="Alta sin caravana" action={crearGenericos} description="Incorporá animales que ya están en el campo. Cada uno conserva su ficha y podrá identificarse más adelante.">
 <Field label="Cantidad de animales"><Input name="cantidad" type="number" min="1" max="500" step="1" defaultValue="1" required/></Field>
 <IntakeDefaults {...props}/><Field label="Peso por animal (kg, opcional)"><Input name="peso_actual" type="number" min="0.01" max="9999" step="0.01"/></Field>
 <p className="text-xs text-muted-foreground">No hace falta inventar una caravana ni cargar RFID. Esta alta es de stock inicial; las compras se registran en Movimientos.</p>
 </FormDialog>;}
