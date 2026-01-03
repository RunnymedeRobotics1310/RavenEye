type PropTypes = {
  title?: string;
  children: React.ReactNode;
};

const ErrorMessage = (props: PropTypes) => {
  const { title, children } = props;
  return (
    <section className={"errorMessage"}>
      <h2>{title ? title : "An error has occurred"}</h2>
      {children}
    </section>
  );
};

export default ErrorMessage;
