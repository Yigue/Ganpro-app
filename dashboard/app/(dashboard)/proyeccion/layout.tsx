import { ProyeccionTabs } from '@/components/proyeccion/proyeccion-tabs';

export default function ProyeccionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProyeccionTabs />
      {children}
    </>
  );
}
