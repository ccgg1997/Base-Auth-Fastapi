import unittest

from src.assistant import filtrar_pacientes, format_dashboard


PATIENTS = [
    {
        "nombre_completo": "Ana Pérez",
        "documento": "101",
        "ciudad": "Bogotá",
        "eps_nombre": "Salud Total",
        "estado": "Pendiente",
        "prioridad": "Alta",
    },
    {
        "nombre_completo": "Luis Gómez",
        "documento": "202",
        "ciudad": "Cali",
        "eps_nombre": "Nueva EPS",
        "estado": "Atendido",
        "prioridad": "Baja",
    },
]


class AssistantHelpersTest(unittest.TestCase):
    def test_filters_patient_by_name(self):
        result = filtrar_pacientes("Información de Ana Pérez", PATIENTS)
        self.assertEqual([patient["documento"] for patient in result], ["101"])

    def test_filters_by_status_and_priority(self):
        result = filtrar_pacientes("pacientes pendientes de prioridad alta", PATIENTS)
        self.assertEqual([patient["documento"] for patient in result], ["101"])

    def test_formats_dashboard_metrics(self):
        text = format_dashboard(
            {
                "meta": {"fecha_desde": "2026-07-01", "fecha_hasta": "2026-07-14"},
                "metricas": {
                    "pacientes_registrados": {"valor": 12},
                    "pacientes_pendientes": {"valor": 3},
                },
            }
        )
        self.assertIn("Pacientes registrados: 12", text)
        self.assertIn("Pendientes: 3", text)


if __name__ == "__main__":
    unittest.main()
