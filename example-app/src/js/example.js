import { HealthFitness } from '@capacitor/health-fitness';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    HealthFitness.echo({ value: inputValue })
}
