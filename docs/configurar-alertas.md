# 🔔 Cómo añadir y configurar nuevas alertas en tu panel de cliente

Tener bajo control el rendimiento de tus Agentes IA y los gastos asociados es fundamental. Por este motivo, hemos incorporado un nuevo sistema de **Alertas Automáticas por Email** que te avisará en tiempo real ante cualquier evento inusual o te enviará un cómodo resumen diario.

A continuación, te explicamos en detalle qué son, cómo configurarlas y cómo interpretarlas.

---

## ⚙️ ¿Cómo acceder a la configuración de alertas?

Puedes entrar al panel de gestión de alertas de dos formas muy sencillas desde tu interfaz de usuario:

1. **La Campanita Rápida (Recomendado):** En cualquier pantalla de tu panel (Dashboard), observarás una nueva **campana de notificaciones** en la esquina superior derecha (junto a tu saldo y perfil). Al hacer clic en ella, se desplegará instantáneamente el panel flotante de alertas.
2. **Desde el Menú Lateral:** En la barra izquierda de navegación, haz clic en la sección **Configuración** (`⚙️`) para abrir la página dedicada de ajustes a pantalla completa.

---

## ✉️ 1. Define tu correo electrónico receptor

El primer paso indispensable (que el sistema te pedirá nada más abrir la configuración por primera vez) es indicar **a qué dirección de email** quieres que enviemos estos avisos.

Introduce una dirección de correo a la que prestes atención regularmente (por ejemplo, el correo del responsable comercial, atención al cliente o tu propio correo principal) y pulsa "Continuar". 

> **Nota:** Podrás modificar este correo más adelante en cualquier momento pulsando en el botón "Cambiar" desde el propio panel de alertas. Todos los mensajes te llegarán remitidos por nuestro sistema seguro `alertas@lafabrica.netelip.com`.

---

## 🎛️ 2. Tipos de Alertas y Ajustes de Umbrales

Una vez guardado tu correo, aparecerán varias tarjetas. Cada una representa un "evento" distinto que puede vigilar el sistema por ti. Todas vienen desactivadas por defecto para no molestarte. 

Para habilitar una alerta, simplemente debes pulsar su **interruptor (Toggle)** de la derecha (se pondrá de color azul). Si la alerta necesita un límite numérico (umbral), se desplegará un campo para que decidas exactamente a partir de qué número quieres que te avisemos.

Estas son las métricas básicas que cubrimos en esta fase:

### 📉 1. Tasa de éxito baja
- **¿Qué hace?**: Analiza cada llamada que finaliza tu agente de IA en tiempo real. 
- **¿Cómo se configura?**: Te pedirá que fijes un umbral de éxito mínimo aceptable en porcentaje (%). 
- **¿Para qué sirve?**: Si ajustas el límite al `70%`, nuestro sistema evaluará internamente si la llamada ha sido exitada ("Successful"). En el caso de que la tasa de conversión promedio del agente decaiga severamente, u ocurran fallos y termine la llamada por debajo de este límite, recibirás un correo avisándote del bajón en la calidad al momento para que puedas tomar acción o reescribir la plantilla del robot.

### 😟 2. Sentimiento negativo
- **¿Qué hace?**: Detecta si tu usuario/cliente final se molestó o enfadó demasiado durante la conversación y te avisa.
- **¿Cómo se configura?**: Defines a partir de qué porcentaje de negatividad (%) deseas el aviso. 
- **¿Para qué sirve?**: La IA examina las transcripciones completas. Si ajustas el límite al `40%`, en cuanto un cliente termine la llamada y muestre gran disconformidad o el sentimiento sea un 40% o más negativo, te llegará un correo. Así podrás contactarlo rápidamente para enmendar la situación, protegiendo tu reputación.

### 💸 3. Coste elevado
- **¿Qué hace?**: Controla tu gasto para que nunca te asustes con el saldo.
- **¿Cómo se configura?**: Ingresas el tope de Euros (€) diarios que no deseas superar.
- **¿Para qué sirve?**: Si estableces el límite en `5 €` y una llamada provoca que durante el día actual sobrepases ese gasto acumulado, nuestra alerta en tiempo real te enviará un email al instante. 

### 📋 4. Resumen diario
- **¿Qué hace?**: A diferencia de las anteriores que saltan *"en el momento que ocurre el problema"*, esta funciona en conjunto como un reporte estático nocturno/matutino.
- **¿Cómo se configura?**: Solo tienes que encenderla. No requiere umbral matemático.
- **¿Para qué sirve?**: Todos los días de manera ininterrumpida, te enviaremos al email un informe condensado muy fácil de leer. Resumirá cómo fue el día de ayer: cuántas llamadas tomó la IA en total, cuál fue la tasa de éxito general y el gasto total exacto. Ideal para reportes directivos.

---

## 💾 3. Guardar Cambios

Una vez hayas encendido los interruptores de los avisos que quieres recibir y hayas escrito los numeritos de los límites (umbrales), **recuerda pulsar siempre el botón grande azul de *"Guardar alertas"*** al final del documento.

Si no lo pulsas o cambias de ventana de golpe, ¡los cambios no se activarán! Verás una etiqueta verde `✓ Alertas guardadas` cuando todo esté listo.

¡Con estos pasos tu Agente operará de manera autónoma pero tú nunca perderás el control de lo que sucede!
