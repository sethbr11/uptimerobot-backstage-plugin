import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";

/** The status pill component
 * 
 * @param status - The status of the monitor
 * @returns The status pill
 */
export function StatusPill({ status }: { status: string }) {
  const operational = status === 'Up';

  return (
    <Box display="flex" alignItems="center" style={{ gap: 8 }}>
      <Box
        aria-hidden
        style={{
          backgroundColor: operational ? '#2ecc71' : '#e53935', // Green or Red
          borderRadius: '50%',
          height: 10,
          width: 10,
        }}
      />
      <Typography
        variant="body2"
        component="span"
        style={{ color: operational ? '#20b865' : '#e53935' }}
      >
        {operational ? 'Operational' : status}
      </Typography>
    </Box>
  );
}
