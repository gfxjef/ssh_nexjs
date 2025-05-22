const Loader = ({ mensaje = "Cargando..." }: { mensaje?: string }) => {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-75 flex flex-col justify-center items-center z-40 rounded-lg">
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2e3954]"></div>
        <p className="mt-4 text-lg text-gray-700">{mensaje}</p>
      </div>
    </div>
  );
};

export default Loader; 