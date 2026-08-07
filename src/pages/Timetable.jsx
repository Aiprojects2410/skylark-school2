import { PageHeader } from '../components/ui'

export default function Timetable() {
  const schedule = [
    { period: 'Period 1 (08:30 - 09:15 AM)', subject: 'Mathematics', teacher: 'Dr. Ramesh Gupta' },
    { period: 'Period 2 (09:15 - 10:00 AM)', subject: 'Physics', teacher: 'Sunita Mehra' },
    { period: 'Period 3 (10:00 - 10:45 AM)', subject: 'English', teacher: 'Amitabh Kumar' },
    { period: 'Break (10:45 - 11:15 AM)', subject: 'Recess', teacher: '—' },
    { period: 'Period 4 (11:15 - 12:00 PM)', subject: 'Computer Science', teacher: 'Priya Sharma' }
  ]

  return (
    <>
      <PageHeader
        eyebrow="SCHEDULE"
        title="Class Timetable"
        subtitle="Daily period schedule, subject allocations, and teacher assignments."
      />

      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Time / Period</th>
              <th>Subject</th>
              <th>Teacher</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((slot, idx) => (
              <tr key={idx}>
                <td className="font-semibold text-brand">{slot.period}</td>
                <td className="font-medium text-ink dark:text-white">{slot.subject}</td>
                <td>{slot.teacher}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
