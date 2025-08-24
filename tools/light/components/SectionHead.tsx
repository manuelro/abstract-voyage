// @ts-nocheck

const SectionHead = ({ title, subtitle }) => (
    <div className="row pb-4" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        {subtitle && <div>{subtitle}</div>}
    </div>
);

export default SectionHead;