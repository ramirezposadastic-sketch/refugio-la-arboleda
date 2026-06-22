const politicas = [
  {
    titulo: "1. Anticipo y confirmación de reserva",
    texto:
      "Para confirmar la reserva se solicita un anticipo del 40% del valor total. Este anticipo garantiza el cupo de la cabaña en las fechas seleccionadas.",
  },
  {
    titulo: "2. Cancelación con más de 7 días de antelación",
    texto:
      "Si la cancelación se realiza con más de siete (7) días de antelación a la fecha de llegada, el anticipo será devuelto en su totalidad, sin penalidad.",
  },
  {
    titulo: "3. Cancelación entre 7 y 3 días antes de la llegada",
    texto:
      "Si la cancelación se realiza entre siete (7) y tres (3) días antes de la fecha de llegada, el anticipo será devuelto aplicando una penalidad del 15% sobre el valor total de la reserva.",
  },
  {
    titulo: "4. Cancelación con menos de 3 días de antelación",
    texto:
      "Si la cancelación se realiza con menos de tres (3) días de antelación a la fecha de llegada, no habrá devolución del anticipo, ya que la cabaña queda bloqueada para otros huéspedes.",
  },
  {
    titulo: "5. No show o salida anticipada",
    texto:
      "En caso de no presentarse el día de la reserva o retirarse antes de la fecha pactada, no habrá devolución de dinero.",
  },
  {
    titulo: "6. Devoluciones mediante pasarela de pago",
    texto:
      "Cuando el anticipo o pago haya sido realizado a través de una pasarela de pago electrónica, cualquier devolución estará sujeta al descuento de las comisiones y costos de transacción cobrados por la entidad procesadora del pago. Actualmente, este valor corresponde al 5% del monto transaccionado, el cual no es reembolsable por Refugio La Arboleda.",
  },
  {
    titulo: "7. Aceptación de términos",
    texto:
      "Al realizar el pago del anticipo, el huésped acepta de manera automática estos Términos y Condiciones.",
  },
];

function Terminos() {
  return (
    <section id="terminos" className="terminos">
      <div className="terminos-contenido">
        <span className="terminos-etiqueta">Políticas del hotel</span>
        <h2>Términos y Condiciones</h2>
        <p className="terminos-intro">
          Con el fin de brindar claridad y una mejor experiencia a todos nuestros huéspedes,
          compartimos nuestras políticas de reserva, cancelación y modificaciones.
        </p>

        <div className="terminos-grid">
          {politicas.map((politica) => (
            <article className="termino-card" key={politica.titulo}>
              <h3>{politica.titulo}</h3>
              <p>{politica.texto}</p>
            </article>
          ))}
        </div>

        <p className="terminos-cierre">
          Agradecemos su comprensión. Estas políticas nos permiten garantizar una adecuada
          gestión de las reservas y una mejor experiencia para todos nuestros huéspedes.
        </p>
      </div>
    </section>
  );
}

export default Terminos;
